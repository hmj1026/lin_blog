/**
 * Newsletter 模組的 client-safe 公開介面：僅限純 domain 驗證邏輯。
 *
 * 「use client」元件需要與伺服器共用同一份驗證規則（SSOT）時，
 * 一律從本 barrel 匯入；本檔案 MUST NOT 匯入 server-only、Prisma
 * 或模組組合根（index.ts）。伺服器端請改用 `@/modules/newsletter`。
 */
export {
  validateSubscriberInput,
  normalizeSubscriberEmail,
  MAX_SUBSCRIBER_NAME_LENGTH,
  MAX_SUBSCRIBER_EMAIL_LENGTH,
} from "./domain/subscriber";
export type {
  ValidatedSubscriberInput,
  SubscriberFieldErrors,
  SubscriberValidationResult,
} from "./domain/subscriber";
