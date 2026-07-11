import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { newsletterUseCases, type SubscribeResult } from "@/modules/newsletter";
import { MAX_SUBSCRIBER_NAME_LENGTH, MAX_SUBSCRIBER_EMAIL_LENGTH } from "@/modules/newsletter/client";
import type { ApiResponse } from "@/types/api";

export const dynamic = "force-dynamic";

/** 泛化訊息：驗證失敗、CAPTCHA 失敗一律使用同一則文案，不揭露原因 */
const GENERIC_INVALID_MESSAGE = "輸入內容有誤，請確認後再試";
/** 泛化訊息：限流命中 */
const GENERIC_RATE_LIMIT_MESSAGE = "請求過於頻繁，請稍後再試";
/** 泛化訊息：未預期例外，不得洩漏內部細節 */
const GENERIC_SERVER_ERROR_MESSAGE = "系統發生錯誤，請稍後再試";

const subscribeRequestSchema = z.object({
  name: z.string().max(MAX_SUBSCRIBER_NAME_LENGTH),
  email: z.string().max(MAX_SUBSCRIBER_EMAIL_LENGTH),
  captchaToken: z.string().max(4096),
});

/**
 * 從 `x-real-ip` / `x-forwarded-for` 推導客戶端來源識別。
 * 僅用於傳給 use case 作為限流 `sourceKey`（由 rate limiter port 內部雜湊），
 * 不得記錄於日誌。
 *
 * 優先序：`x-real-ip` 優先 — nginx（見 nginx/conf.d/blog.conf）一律以
 * `$remote_addr` 無條件設定該 header，值可信。`x-forwarded-for` 則由 nginx
 * 以 `$proxy_add_x_forwarded_for` 附加真實 IP 於「最後一段」，但第一段可由
 * 客戶端任意偽造，故僅在缺少 `x-real-ip` 時才退回取其最後一段作為次選；
 * 兩者皆缺時回傳 "unknown"。
 *
 * 注意：此處刻意不與 middleware.ts 共用同一慣例（該處另案追蹤修正）。
 */
function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const lastSegment = forwardedFor
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .pop();
    if (lastSegment) return lastSegment;
  }
  return "unknown";
}

/** 從 `Host` header 推導 CAPTCHA 驗證用的 hostname context */
function getHostname(headers: Headers): string | undefined {
  return headers.get("host")?.trim() || undefined;
}

/**
 * 每次程序啟動時隨機產生的 HMAC 金鑰，僅用於 {@link maskEmail}。
 *
 * 採 per-process 隨機金鑰即可：此雜湊僅作為單一程序生命週期內的日誌關聯 id，
 * 從不作為安全邊界使用，故無需跨程序、跨重啟保持穩定或另行管理金鑰。
 * 相較未加鹽的 sha256，可避免日誌讀者以彩虹表反查 email 是否存在。
 */
const EMAIL_MASK_KEY = crypto.randomBytes(32);

/**
 * 產生不可逆的遮罩識別碼，供日誌關聯使用（HMAC-SHA256 後取前 12 碼），
 * 絕不記錄原始 Email。
 */
function maskEmail(normalizedEmail: string): string {
  return crypto.createHmac("sha256", EMAIL_MASK_KEY).update(normalizedEmail).digest("hex").slice(0, 12);
}

/** 429 回應需要附帶 `Retry-After` header，`jsonError` 不支援自訂 header，故於此組裝 */
function rateLimitedResponse(retryAfterSeconds: number) {
  const body: ApiResponse<null> = { success: false, message: GENERIC_RATE_LIMIT_MESSAGE };
  return NextResponse.json(body, {
    status: 429,
    headers: { "Retry-After": String(retryAfterSeconds) },
  });
}

/**
 * 記錄訂閱結果的可觀測性事件。
 *
 * 僅記錄 request id、結果類型與遮罩後的 Email 識別碼；絕不記錄 CAPTCHA token、
 * secret、完整姓名、完整 Email、原始 IP 或 request body。
 */
function logSubscribeResult(requestId: string, emailHash: string, result: SubscribeResult): void {
  const context = { requestId, emailHash, result: result.status };
  if (result.status === "rate-limited" || result.status === "captcha-failed") {
    logger.warn("newsletter.subscribe.result", context);
    return;
  }
  logger.info("newsletter.subscribe.result", context);
}

/**
 * 記錄未預期例外，僅保留 request id 與泛化錯誤碼，不記錄例外訊息或堆疊，
 * 避免內部細節（含意外包含個資的錯誤字串）流入日誌。
 */
function logUnexpectedError(requestId: string): void {
  logger.error("newsletter.subscribe.error", { requestId, code: "UNEXPECTED_ERROR" });
}

/**
 * POST /api/newsletter/subscribe — 公開訂閱端點（thin adapter）。
 *
 * 僅負責：解析與 schema 驗證 request body、推導來源識別與 hostname、呼叫
 * `newsletterUseCases.subscribe`、把 typed 結果映射為 HTTP 狀態碼。所有驗證
 * 順序（輸入 → 限流 → CAPTCHA → 寫入）與泛化成功語意均由 use case 負責。
 *
 * 已知限制：`SubscribeResult` 的 `captcha-failed` 狀態未區分「token 無效」與
 * 「provider/設定錯誤」，故兩者目前一律回傳 400；若日後需要對外區分為
 * 502（provider/設定錯誤），須先擴充 use case 回傳的 `reason`。
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(GENERIC_INVALID_MESSAGE, 400);
  }

  const parsed = subscribeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(GENERIC_INVALID_MESSAGE, 400);
  }

  const sourceKey = getClientIp(request.headers);
  const hostname = getHostname(request.headers);
  const emailHash = maskEmail(parsed.data.email.trim().toLowerCase());

  try {
    const result = await newsletterUseCases.subscribe({
      name: parsed.data.name,
      email: parsed.data.email,
      captchaToken: parsed.data.captchaToken,
      sourceKey,
      hostname,
    });

    logSubscribeResult(requestId, emailHash, result);

    switch (result.status) {
      case "subscribed":
        return jsonOk({ subscribed: true });
      case "invalid":
      case "captcha-failed":
        return jsonError(GENERIC_INVALID_MESSAGE, 400);
      case "rate-limited":
        return rateLimitedResponse(result.retryAfterSeconds);
      default:
        return jsonError(GENERIC_SERVER_ERROR_MESSAGE, 500);
    }
  } catch {
    logUnexpectedError(requestId);
    return jsonError(GENERIC_SERVER_ERROR_MESSAGE, 500);
  }
}
