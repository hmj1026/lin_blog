/**
 * Newsletter 模組 DI 組合根。
 *
 * 比照 `postsUseCases`/`siteSettingsUseCases` 的組成模式，將 Prisma
 * repository、reCAPTCHA v2 adapter 與 process-local rate limiter 注入
 * `createNewsletterUseCases` 組成單例，供 API route / Server Component 使用。
 *
 * Rate limiter 建構子在設定無效或 `APP_REPLICA_COUNT > 1` 時會 fail fast
 * （見 `in-memory-rate-limiter.ts`）。預設環境變數皆有合理預設值，
 * 因此模組載入本身不會因缺少環境變數而拋出例外；只有明確設定錯誤的
 * 值（例如非正整數）才會在載入時失敗，這是刻意的 fail-fast 行為。
 */
import "server-only";

import { createNewsletterUseCases } from "./application/use-cases";
import { subscriberWriteRepositoryPrisma } from "./infrastructure/prisma/subscriber-write.repository.prisma";
import { subscriberListRepositoryPrisma } from "./infrastructure/prisma/subscriber-list.repository.prisma";
import { createRecaptchaVerifier } from "./infrastructure/captcha/recaptcha.adapter";
import { resolveRecaptchaConfig } from "./infrastructure/captcha/config";
import { createCaptchaTestDoubleVerifier, isCaptchaTestDoubleEnabled } from "./infrastructure/captcha/test-double";
import { createInMemoryNewsletterRateLimiter } from "./infrastructure/rate-limit/in-memory-rate-limiter";
import { resolveNewsletterRateLimiterConfigFromEnv } from "./infrastructure/rate-limit/config";

const recaptchaConfig = resolveRecaptchaConfig({
  secretKey: process.env.RECAPTCHA_SECRET_KEY,
  siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  allowedHostnames: process.env.RECAPTCHA_ALLOWED_HOSTNAMES,
});

const rateLimiterConfig = resolveNewsletterRateLimiterConfigFromEnv({
  windowSecondsRaw: process.env.NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS,
  maxRequestsRaw: process.env.NEWSLETTER_RATE_LIMIT_MAX,
  replicaCountRaw: process.env.APP_REPLICA_COUNT,
  sourceHashSecretRaw: process.env.NEWSLETTER_SOURCE_HASH_SECRET,
});

/**
 * 可控 CAPTCHA 測試替身（僅供 Playwright E2E，tasks.md 9.5）：只有
 * `NEWSLETTER_CAPTCHA_TEST_DOUBLE === "1"` 且非 production NODE_ENV 時，才以
 * 確定性假 verifier 取代 Google reCAPTCHA adapter；production 一律忽略此旗標、
 * fail closed 回退真正的 verifier（見 `./infrastructure/captcha/test-double.ts`）。
 * 兩個環境變數只應出現在 `playwright.config.ts` 的 `webServer.env`，不得寫入
 * `.env` 檔案。
 */
const captchaVerifier = isCaptchaTestDoubleEnabled({
  NEWSLETTER_CAPTCHA_TEST_DOUBLE: process.env.NEWSLETTER_CAPTCHA_TEST_DOUBLE,
  NODE_ENV: process.env.NODE_ENV,
})
  ? createCaptchaTestDoubleVerifier()
  : createRecaptchaVerifier(recaptchaConfig);

export const newsletterUseCases = createNewsletterUseCases({
  writeRepo: subscriberWriteRepositoryPrisma,
  listRepo: subscriberListRepositoryPrisma,
  captchaVerifier,
  rateLimiter: createInMemoryNewsletterRateLimiter(rateLimiterConfig),
});

export { createNewsletterUseCases } from "./application/use-cases";
export type { NewsletterUseCases, SubscribeResult } from "./application/use-cases";
export type {
  CaptchaVerifier,
  CaptchaVerifyResult,
  CaptchaFailureReason,
  NewsletterRateLimiter,
  RateLimitCheckResult,
  SubscriberListItem,
  SubscriberListRepository,
  SubscriberListResult,
  SubscriberRecord,
  SubscriberWriteRepository,
  CreateSubscriberResult,
} from "./application/ports";
export {
  validateSubscriberInput,
  normalizeSubscriberEmail,
  MAX_SUBSCRIBER_NAME_LENGTH,
  MAX_SUBSCRIBER_EMAIL_LENGTH,
} from "./domain";
export type { ValidatedSubscriberInput, SubscriberFieldErrors, SubscriberValidationResult } from "./domain";
