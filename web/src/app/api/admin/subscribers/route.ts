import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { newsletterQueries } from "@/lib/server-queries";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** 後台名單分頁預設值；上限由 newsletter use case 的 clamp 邏輯統一把關（SSOT） */
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
/** 搜尋字串長度上限，避免以超長字串探測/施壓底層查詢 */
const MAX_SEARCH_LENGTH = 200;

/**
 * PII 回應一律禁止任何共享／中介快取：`dynamic = "force-dynamic"` 只影響
 * Next.js 端渲染行為，瀏覽器與 proxy 的 HTTP cache policy 必須由此 header 明確宣告。
 */
const PII_CACHE_CONTROL = "private, no-store";

function withNoStore(response: Response): Response {
  response.headers.set("Cache-Control", PII_CACHE_CONTROL);
  return response;
}

/** 嚴格十進位驗證：整串必須是數字（拒絕 `1junk` 這類寬鬆 parseInt 結果），非法值退回預設。 */
function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw === null || !/^\d+$/.test(raw)) return fallback;
  const value = parseInt(raw, 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

/**
 * GET /api/admin/subscribers - 取得後台訂閱者名單（有界分頁 + 姓名/Email 搜尋）
 *
 * 僅 `subscribers:view` 權限（預設僅 ADMIN）可存取；回應只包含安全 DTO 欄位，
 * 未授權時不得回傳任何訂閱者資料或總筆數。
 */
export async function GET(request: NextRequest) {
  const authError = await requirePermission("subscribers:view");
  if (authError) return withNoStore(authError);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q")?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined;
    const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

    const result = await newsletterQueries.listSubscribers({ search, page, pageSize });

    // 回傳 use case 實際生效（已夾限）的 page / pageSize，而非使用者請求的原始值，
    // 避免 consumer 依請求值（例如 pageSize=9999）計算出錯誤的分頁總數。
    return withNoStore(
      jsonOk({ items: result.items, total: result.total, page: result.page, pageSize: result.pageSize })
    );
  } catch {
    // PII 相鄰 route：未受控例外的 message/stack 可能含連線資訊或個資，
    // 比照 newsletter subscribe 端點只記錄泛化錯誤碼（不記錄例外內容）
    logger.error("admin.subscribers.error", { code: "UNEXPECTED_ERROR" });
    return withNoStore(jsonError("系統發生錯誤，請稍後再試", 500));
  }
}
