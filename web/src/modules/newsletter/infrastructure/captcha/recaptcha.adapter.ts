/**
 * Google reCAPTCHA v2 siteverify adapter，實作 {@link CaptchaVerifier} port。
 *
 * 缺少設定、token 遺失、hostname 不符、provider 逾時或任何非預期錯誤一律
 * fail closed，並只回傳 port 定義的泛化 {@link CaptchaFailureReason}，不得
 * 洩漏 secret 或內部錯誤細節。
 */
import type { CaptchaVerifier, CaptchaVerifyResult } from "../../application/ports";
import type { RecaptchaConfig } from "./config";

/** Google siteverify 逾時上限（毫秒），避免單次驗證無限期阻塞訂閱流程 */
export const RECAPTCHA_VERIFY_TIMEOUT_MS = 5000;

const GOOGLE_SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

type SiteverifyResponseBody = {
  success?: boolean;
  hostname?: string;
};

export type CreateRecaptchaVerifierOptions = Readonly<{
  /** 可注入的 fetch 實作（測試用），預設使用全域 `fetch` */
  fetchImpl?: typeof fetch;
  /** 可覆寫的 siteverify URL（測試用） */
  verifyUrl?: string;
  /** 可覆寫的逾時毫秒數（測試用），預設 {@link RECAPTCHA_VERIFY_TIMEOUT_MS} */
  timeoutMs?: number;
}>;

/**
 * 建立 reCAPTCHA v2 CAPTCHA verifier。
 *
 * @param config - {@link RecaptchaConfig}；`null` 代表未設定，一律回傳 `not-configured`
 * @param options - 測試用注入點（fetch 實作、URL、逾時）
 */
export function createRecaptchaVerifier(
  config: RecaptchaConfig | null,
  options: CreateRecaptchaVerifierOptions = {}
): CaptchaVerifier {
  const fetchImpl = options.fetchImpl ?? fetch;
  const verifyUrl = options.verifyUrl ?? GOOGLE_SITEVERIFY_URL;
  const timeoutMs = options.timeoutMs ?? RECAPTCHA_VERIFY_TIMEOUT_MS;

  return {
    async verify(token, context): Promise<CaptchaVerifyResult> {
      if (!config) {
        return { ok: false, reason: "not-configured" };
      }
      if (!token) {
        return { ok: false, reason: "missing-token" };
      }

      let response: Response;
      try {
        const body = new URLSearchParams({ secret: config.secretKey, response: token });
        response = await fetchImpl(verifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        // 涵蓋逾時（AbortError）與網路層錯誤，一律回傳泛化 provider-error
        return { ok: false, reason: "provider-error" };
      }

      if (!response.ok) {
        return { ok: false, reason: "provider-error" };
      }

      let payload: SiteverifyResponseBody;
      try {
        payload = await response.json();
      } catch {
        return { ok: false, reason: "provider-error" };
      }

      if (!payload.success) {
        return { ok: false, reason: "invalid-token" };
      }

      const verifiedHostname = payload.hostname?.toLowerCase();
      const isAllowedHostname =
        !!verifiedHostname &&
        config.allowedHostnames.some((hostname) => hostname.toLowerCase() === verifiedHostname);

      if (!isAllowedHostname) {
        return { ok: false, reason: "hostname-mismatch" };
      }

      // 若呼叫端（route）提供了請求來源 hostname，需與 Google 回傳的 hostname 一致，
      // 作為 token 重放/跨站濫用的縱深防禦；缺少 context.hostname 時略過此檢查。
      if (context?.hostname && context.hostname.toLowerCase() !== verifiedHostname) {
        return { ok: false, reason: "hostname-mismatch" };
      }

      return { ok: true };
    },
  };
}
