"use client";

/**
 * reCAPTCHA v2 測試替身 widget（僅供 Playwright E2E，見 tasks.md 9.5「可控 CAPTCHA 測試替身」）。
 *
 * 只有在 `newsletter-form.tsx` 判定 `NEXT_PUBLIC_RECAPTCHA_SITE_KEY === "e2e-test"`
 * 且非 production 建置時才會掛載此元件（不呼叫 Google、不載入 `recaptcha/api.js`）。
 * 元件本身無狀態：每個按鈕直接把對應的測試 token 回傳給呼叫端，由呼叫端的
 * `captchaToken` state 決定後續行為，避免 stub 自己的視覺狀態與表單狀態失去同步。
 *
 * Token 對應需與伺服器測試替身
 * `src/modules/newsletter/infrastructure/captcha/test-double.ts` 保持一致：
 * "e2e-pass" 成功、"e2e-expired" 模擬過期/失效、"e2e-provider-error" 模擬
 * provider 失敗。
 */

const TEST_TOKENS = [
  { value: "e2e-pass", label: "驗證通過（測試）" },
  { value: "e2e-expired", label: "驗證已過期（測試）" },
  { value: "e2e-provider-error", label: "驗證服務錯誤（測試）" },
] as const;

type RecaptchaTestDoubleWidgetProps = {
  onTokenChange: (token: string) => void;
  onReset: () => void;
};

export function RecaptchaTestDoubleWidget({ onTokenChange, onReset }: RecaptchaTestDoubleWidgetProps) {
  return (
    <div
      data-testid="recaptcha-stub"
      role="group"
      aria-label="reCAPTCHA 測試替身（僅供自動化測試）"
      className="space-y-2 rounded-lg border border-dashed border-line p-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-base-300">
        CAPTCHA 測試替身
      </p>
      <div className="flex flex-wrap gap-2">
        {TEST_TOKENS.map((token) => (
          <button
            key={token.value}
            type="button"
            data-testid={`recaptcha-stub-token-${token.value}`}
            onClick={() => onTokenChange(token.value)}
            className="rounded border border-line px-2 py-1 text-xs font-semibold text-primary hover:border-primary/40"
          >
            {token.label}
          </button>
        ))}
        <button
          type="button"
          data-testid="recaptcha-stub-reset"
          onClick={onReset}
          className="rounded border border-line px-2 py-1 text-xs font-semibold text-primary hover:border-primary/40"
        >
          清除
        </button>
      </div>
    </div>
  );
}
