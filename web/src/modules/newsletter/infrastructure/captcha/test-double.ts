/**
 * 可控 CAPTCHA 測試替身（僅供 Playwright E2E 使用，見 tasks.md 9.5「可控 CAPTCHA 測試替身」）。
 *
 * 嚴格閘控：只有在 `NEWSLETTER_CAPTCHA_TEST_DOUBLE === "1"` 且
 * `process.env.NODE_ENV !== "production"` 時，`index.ts` 的 DI 組裝才會選用
 * 此 verifier（見 {@link isCaptchaTestDoubleEnabled} 與 `index.ts` 的
 * `resolveCaptchaVerifier`）。production NODE_ENV 一律忽略此旗標、fail closed
 * 回退到真正的 Google reCAPTCHA verifier —— 即使誤設定該環境變數，正式環境
 * 也絕不會接受測試 token。
 *
 * Token 對應（與 `src/components/newsletter/recaptcha-test-double-widget.tsx`
 * 的按鈕值一致）：
 * - "e2e-pass" → 驗證成功
 * - "e2e-expired" → invalid-token（模擬過期/失效 token）
 * - "e2e-provider-error" → provider-error（模擬 Google 服務逾時/失敗）
 * - 其他任意非空字串 → invalid-token
 */
import type { CaptchaVerifier, CaptchaVerifyResult } from "../../application/ports";

/** 建立可控 CAPTCHA 測試替身 verifier。 */
export function createCaptchaTestDoubleVerifier(): CaptchaVerifier {
  return {
    async verify(token): Promise<CaptchaVerifyResult> {
      if (!token) return { ok: false, reason: "missing-token" };
      if (token === "e2e-pass") return { ok: true };
      if (token === "e2e-provider-error") return { ok: false, reason: "provider-error" };
      return { ok: false, reason: "invalid-token" };
    },
  };
}

/**
 * 判斷是否啟用 CAPTCHA 測試替身。
 *
 * Fail closed：`NODE_ENV === "production"` 時一律回傳 `false`，不論
 * `NEWSLETTER_CAPTCHA_TEST_DOUBLE` 為何值。
 */
export function isCaptchaTestDoubleEnabled(env: {
  NEWSLETTER_CAPTCHA_TEST_DOUBLE?: string;
  NODE_ENV?: string;
}): boolean {
  if (env.NODE_ENV === "production") return false;
  return env.NEWSLETTER_CAPTCHA_TEST_DOUBLE === "1";
}
