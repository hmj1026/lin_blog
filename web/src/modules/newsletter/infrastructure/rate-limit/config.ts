/**
 * Newsletter 限流設定的環境變數解析器。
 *
 * 純函式，接受已讀出的原始字串（不直接讀 `process.env`，故不在模組載入時
 * 拋出例外），套用 `NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS`（預設 600）、
 * `NEWSLETTER_RATE_LIMIT_MAX`（預設 5）、`APP_REPLICA_COUNT`（預設 1）的
 * 預設值。實際的「非正整數 / 超過上限 fail fast」驗證交由
 * {@link createInMemoryNewsletterRateLimiter} 的建構子執行 —— 本函式對於
 * `windowSeconds`/`maxRequests` 的無效字串刻意「原樣傳遞」（例如轉換為
 * `NaN`），讓建構子統一 fail fast，而非在此處靜默套用預設值掩蓋設定錯誤。
 *
 * `APP_REPLICA_COUNT` 同樣採原樣傳遞：未設定（空白）時回退為 `1`，但只要
 * 有提供就必須是正整數，無效值（如 `two`、`0`、`-1`）由建構子拒絕啟動，
 * 避免非法設定靜默繞過多 replica 的守門檢查。
 *
 * `NEWSLETTER_SOURCE_HASH_SECRET` 語意也不同：僅在有設定非空字串時才傳遞，
 * 未設定時保持 `undefined`，交由 {@link createInMemoryNewsletterRateLimiter}
 * 產生 per-process 隨機密鑰作為安全預設值。
 */
import type { NewsletterRateLimiterConfig } from "./in-memory-rate-limiter";

/** `NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS` 預設值（秒） */
export const DEFAULT_WINDOW_SECONDS = 600;
/** `NEWSLETTER_RATE_LIMIT_MAX` 預設值 */
export const DEFAULT_MAX_REQUESTS = 5;
/** `APP_REPLICA_COUNT` 預設值 */
export const DEFAULT_REPLICA_COUNT = 1;

function parseNumberOrFallback(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  return Number(raw);
}

function parseReplicaCount(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_REPLICA_COUNT;
  }
  // 與 windowSeconds/maxRequests 相同：無效字串原樣傳遞（NaN），由建構子
  // 統一 fail fast。部署守門只要有提供就必須是正整數，不得靜默回退為 1。
  return Number(raw);
}

/**
 * 將原始環境變數字串解析為 {@link NewsletterRateLimiterConfig}。
 *
 * @param raw.windowSecondsRaw - `NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS`
 * @param raw.maxRequestsRaw - `NEWSLETTER_RATE_LIMIT_MAX`
 * @param raw.replicaCountRaw - `APP_REPLICA_COUNT`
 * @param raw.sourceHashSecretRaw - `NEWSLETTER_SOURCE_HASH_SECRET`（optional）
 */
export function resolveNewsletterRateLimiterConfigFromEnv(raw: {
  windowSecondsRaw?: string;
  maxRequestsRaw?: string;
  replicaCountRaw?: string;
  sourceHashSecretRaw?: string;
}): NewsletterRateLimiterConfig {
  return {
    windowSeconds: parseNumberOrFallback(raw.windowSecondsRaw, DEFAULT_WINDOW_SECONDS),
    maxRequests: parseNumberOrFallback(raw.maxRequestsRaw, DEFAULT_MAX_REQUESTS),
    replicaCount: parseReplicaCount(raw.replicaCountRaw),
    sourceHashSecret:
      raw.sourceHashSecretRaw !== undefined && raw.sourceHashSecretRaw.trim() !== ""
        ? raw.sourceHashSecretRaw
        : undefined,
  };
}
