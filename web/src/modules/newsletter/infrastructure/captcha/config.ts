/**
 * reCAPTCHA v2 設定讀取器。
 *
 * `resolveRecaptchaConfig` 為純函式，接受已讀出的原始字串（不直接讀 `process.env`），
 * 方便單元測試且不會在模組載入時拋出例外。secret key、site key、允許 hostname
 * 三者缺一即視為未設定，回傳 `null` 讓呼叫端 fail closed（不建置/啟動失敗）。
 */

/** reCAPTCHA 伺服器端可用設定（secret 僅限伺服器使用，不得回傳給前端） */
export type RecaptchaConfig = Readonly<{
  secretKey: string;
  allowedHostnames: readonly string[];
}>;

/**
 * 將環境變數原始字串解析為 {@link RecaptchaConfig}。
 *
 * @param params.secretKey - `RECAPTCHA_SECRET_KEY`（server-only）
 * @param params.siteKey - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`（僅檢查是否存在，不進入回傳值）
 * @param params.allowedHostnames - `RECAPTCHA_ALLOWED_HOSTNAMES`，逗號分隔
 * @returns 設定齊全時回傳 {@link RecaptchaConfig}；缺少任一必要值時回傳 `null`
 */
export function resolveRecaptchaConfig(params: {
  secretKey?: string;
  siteKey?: string;
  allowedHostnames?: string;
}): RecaptchaConfig | null {
  const secretKey = params.secretKey?.trim();
  const siteKey = params.siteKey?.trim();
  const allowedHostnamesRaw = params.allowedHostnames?.trim();

  if (!secretKey || !siteKey || !allowedHostnamesRaw) {
    return null;
  }

  const allowedHostnames = allowedHostnamesRaw
    .split(",")
    .map((hostname) => hostname.trim())
    .filter((hostname) => hostname.length > 0);

  if (allowedHostnames.length === 0) {
    return null;
  }

  return Object.freeze({
    secretKey,
    allowedHostnames: Object.freeze(allowedHostnames),
  });
}
