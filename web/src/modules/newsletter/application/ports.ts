/**
 * Newsletter 模組的 application ports（repository / 外部服務介面）。
 * 具體實作（Prisma repository、reCAPTCHA adapter、rate limiter）由後續 infrastructure 任務提供。
 */

/** 儲存層的訂閱者完整資料（僅限寫入流程內部使用，不得直接回傳給 UI） */
export type SubscriberRecord = Readonly<{
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}>;

/**
 * 建立訂閱者的結果。
 * `conflict` 代表資料庫唯一約束觸發（併發重複 Email），use-case 需將其轉譯為與
 * 首次成功相同的泛化成功結果，不得讓 Prisma 例外洩漏到 application 層。
 */
export type CreateSubscriberResult =
  | { outcome: "created"; subscriber: SubscriberRecord }
  | { outcome: "conflict" };

/**
 * 訂閱寫入 repository。
 * `findByEmail` 供 use-case 判斷是否為既有訂閱者；`create` 為併發安全邊界，
 * 唯一約束衝突時 SHALL 回傳 `{ outcome: "conflict" }` 而非拋出 Prisma 例外。
 */
export interface SubscriberWriteRepository {
  findByEmail(normalizedEmail: string): Promise<SubscriberRecord | null>;
  create(params: { name: string; email: string }): Promise<CreateSubscriberResult>;
}

/** CAPTCHA 驗證失敗原因（僅供內部判斷，不得原樣回傳給使用者） */
export type CaptchaFailureReason =
  | "missing-token"
  | "invalid-token"
  | "hostname-mismatch"
  | "provider-error"
  | "not-configured";

/** CAPTCHA 驗證結果 */
export type CaptchaVerifyResult = { ok: true } | { ok: false; reason: CaptchaFailureReason };

/**
 * CAPTCHA 驗證 port（通用介面，供 reCAPTCHA v2 adapter 實作）。
 * 缺少設定、token 遺失、provider 逾時或失敗一律回傳 `ok: false`（fail closed）。
 */
export interface CaptchaVerifier {
  verify(token: string | null | undefined, context?: { hostname?: string }): Promise<CaptchaVerifyResult>;
}

/** 限流檢查結果 */
export type RateLimitCheckResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Newsletter 專用限流 port。
 * `sourceKey` SHALL 為不可逆的來源雜湊，不得傳入原始 IP。
 */
export interface NewsletterRateLimiter {
  check(sourceKey: string): Promise<RateLimitCheckResult>;
}

/** 後台名單安全 DTO（僅限必要欄位，不含 CAPTCHA、來源或限流資訊） */
export type SubscriberListItem = Readonly<{
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}>;

/** 後台名單查詢結果 */
export type SubscriberListResult = Readonly<{
  items: readonly SubscriberListItem[];
  total: number;
}>;

/**
 * 後台名單 use case 回傳型別：在 repository 結果外附上「實際生效」（已夾限）的
 * 分頁參數，讓 API 誠實回傳被套用的 page / pageSize，而非使用者請求的原始值。
 */
export type SubscriberListPage = SubscriberListResult &
  Readonly<{
    page: number;
    pageSize: number;
  }>;

/**
 * 後台唯讀名單 repository。
 * 實作 SHALL 依 `createdAt DESC`、以 `id` 作為排序 tiebreak 回傳穩定結果，
 * `search` 同時比對姓名與 Email。
 */
export interface SubscriberListRepository {
  list(params: { search?: string; page: number; pageSize: number }): Promise<SubscriberListResult>;
  /** 以 aggregate count 回傳兩個時間窗的新增數，不載入個資列。 */
  countGrowth?(params: { since7Days: Date; since30Days: Date }): Promise<{ last7Days: number; last30Days: number }>;
}
