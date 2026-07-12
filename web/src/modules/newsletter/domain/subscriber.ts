/**
 * Newsletter 訂閱者的純驗證邏輯（domain 層）。
 * 不依賴 Prisma、Next.js 或任何 infrastructure，可獨立單元測試。
 */

/** 姓名最大長度（字元數） */
export const MAX_SUBSCRIBER_NAME_LENGTH = 100;

/** Email 最大長度（依 RFC 5321 慣例上限） */
export const MAX_SUBSCRIBER_EMAIL_LENGTH = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 已驗證且正規化後的訂閱者輸入（唯讀） */
export type ValidatedSubscriberInput = Readonly<{
  name: string;
  email: string;
}>;

/** 欄位層級驗證錯誤訊息（缺席代表該欄位有效） */
export type SubscriberFieldErrors = Readonly<{
  name?: string;
  email?: string;
}>;

/** 驗證結果：成功時附帶正規化後的唯讀值，失敗時附帶欄位錯誤 */
export type SubscriberValidationResult =
  | { ok: true; value: ValidatedSubscriberInput }
  | { ok: false; errors: SubscriberFieldErrors };

/**
 * 將 Email 正規化為 trim 後的小寫字串。
 * 與資料庫唯一約束使用相同的正規化規則，確保應用層與儲存層判斷一致。
 */
export function normalizeSubscriberEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * 驗證訂閱者姓名與 Email。
 *
 * 規則：
 * - 姓名必填，trim 後不得為空字串，長度不得超過 {@link MAX_SUBSCRIBER_NAME_LENGTH}
 * - Email 必填，trim 並轉小寫後需符合基本格式，長度不得超過 {@link MAX_SUBSCRIBER_EMAIL_LENGTH}
 *
 * @param input - 原始姓名與 Email
 * @returns 驗證結果；成功時回傳凍結（immutable）的正規化值物件
 */
export function validateSubscriberInput(input: {
  name: string;
  email: string;
}): SubscriberValidationResult {
  // 防禦執行期非字串輸入（例如未經 schema 驗證即轉發的 JSON body 缺漏欄位）；
  // 型別簽章保證的是編譯期契約，公開 API 邊界仍需在此收斂為 typed result，不得拋出例外。
  const rawName = typeof input.name === "string" ? input.name : "";
  const rawEmail = typeof input.email === "string" ? input.email : "";

  const trimmedName = rawName.trim();
  const normalizedEmail = normalizeSubscriberEmail(rawEmail);

  const errors: { name?: string; email?: string } = {};

  if (!trimmedName) {
    errors.name = "姓名為必填欄位";
  } else if (trimmedName.length > MAX_SUBSCRIBER_NAME_LENGTH) {
    errors.name = `姓名長度不得超過 ${MAX_SUBSCRIBER_NAME_LENGTH} 字元`;
  }

  if (!normalizedEmail) {
    errors.email = "Email 為必填欄位";
  } else if (normalizedEmail.length > MAX_SUBSCRIBER_EMAIL_LENGTH) {
    errors.email = `Email 長度不得超過 ${MAX_SUBSCRIBER_EMAIL_LENGTH} 字元`;
  } else if (!EMAIL_RE.test(normalizedEmail)) {
    errors.email = "Email 格式不正確";
  }

  if (errors.name || errors.email) {
    return { ok: false, errors: Object.freeze(errors) };
  }

  return {
    ok: true,
    value: Object.freeze({ name: trimmedName, email: normalizedEmail }),
  };
}
