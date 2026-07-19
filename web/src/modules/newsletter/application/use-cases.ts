import { validateSubscriberInput, type SubscriberFieldErrors } from "../domain";
import type {
  CaptchaFailureReason,
  CaptchaVerifier,
  NewsletterRateLimiter,
  SubscriberListItem,
  SubscriberListPage,
  SubscriberListRepository,
  SubscriberWriteRepository,
} from "./ports";

export type NewsletterUseCases = ReturnType<typeof createNewsletterUseCases>;

/** 後台名單預設每頁筆數 */
export const DEFAULT_SUBSCRIBER_PAGE_SIZE = 20;
/** 後台名單每頁筆數上限（避免單次查詢/回應過大） */
export const MAX_SUBSCRIBER_PAGE_SIZE = 50;
/**
 * 後台名單頁碼安全上限：防止極大頁碼產生天文數字 OFFSET（昂貴掃描／溢位），
 * 與 discovery 搜尋的頁碼上限採相同防禦值。正常分頁永遠不會接近此值。
 */
export const MAX_SUBSCRIBER_PAGE = 10000;

/**
 * 訂閱結果：對外一律使用泛化狀態，不得洩漏 Email 是否已存在。
 * `captcha-failed` 的 `reason` 僅供伺服器端日誌診斷用，路由層絕不得將其
 * 原樣回傳給用戶端（用戶端一律看到同一則泛化訊息，見 route.ts）。
 */
export type SubscribeResult =
  | { status: "subscribed" }
  | { status: "invalid"; errors: SubscriberFieldErrors }
  | { status: "rate-limited"; retryAfterSeconds: number }
  | { status: "captcha-failed"; reason: CaptchaFailureReason };

/**
 * 泛化成功結果 —— 首次成功與重複 Email 一律回傳此同一物件，
 * 避免透過回應差異洩漏 Email 是否已訂閱。
 */
const GENERIC_SUBSCRIBE_SUCCESS: SubscribeResult = Object.freeze({ status: "subscribed" });

function clampPage(page: number | undefined): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(MAX_SUBSCRIBER_PAGE, Math.max(1, Math.trunc(page as number)));
}

function clampPageSize(pageSize: number | undefined): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_SUBSCRIBER_PAGE_SIZE;
  return Math.min(MAX_SUBSCRIBER_PAGE_SIZE, Math.max(1, Math.trunc(pageSize as number)));
}

/** 將 repository 回傳資料收斂為只含必要欄位的安全 DTO，防止意外欄位外洩 */
function toSafeListItem(record: { id: string; name: string; email: string; createdAt: Date }): SubscriberListItem {
  return { id: record.id, name: record.name, email: record.email, createdAt: record.createdAt };
}

/**
 * 建立 newsletter 模組的 Use Cases。
 *
 * @param deps.writeRepo - 訂閱寫入 repository（必要）
 * @param deps.captchaVerifier - CAPTCHA 驗證 port（必要）
 * @param deps.rateLimiter - 訂閱專用限流 port（必要）
 * @param deps.listRepo - 後台名單唯讀 repository（僅後台管理需要）
 */
export function createNewsletterUseCases(deps: {
  writeRepo: SubscriberWriteRepository;
  captchaVerifier: CaptchaVerifier;
  rateLimiter: NewsletterRateLimiter;
  listRepo?: SubscriberListRepository;
}) {
  return {
    /**
     * 公開訂閱流程：先做廉價輸入驗證，再檢查限流，接著驗證 CAPTCHA，
     * 最後才寫入 repository。刻意不先呼叫 `findByEmail` 判斷是否已存在 ——
     * 若先查再寫，重複 Email 路徑只需 1 次 repository 呼叫、新訂閱路徑需
     * 2 次，回應延遲差異將成為可觀察的 email 存在性 timing oracle
     * （spec 明文禁止）。因此兩條路徑一律只呼叫 `writeRepo.create` 一次，
     * 由資料庫唯一約束作為併發安全邊界；`create` 回傳的 `conflict` outcome
     * 與 `created` outcome 皆映射為相同的泛化成功結果。
     */
    async subscribe(input: {
      name: string;
      email: string;
      captchaToken?: string | null;
      sourceKey: string;
      hostname?: string;
    }): Promise<SubscribeResult> {
      const validation = validateSubscriberInput({ name: input.name, email: input.email });
      if (!validation.ok) {
        return { status: "invalid", errors: validation.errors };
      }

      const rateLimit = await deps.rateLimiter.check(input.sourceKey);
      if (!rateLimit.allowed) {
        return { status: "rate-limited", retryAfterSeconds: rateLimit.retryAfterSeconds };
      }

      const captchaResult = await deps.captchaVerifier.verify(input.captchaToken, { hostname: input.hostname });
      if (!captchaResult.ok) {
        return { status: "captcha-failed", reason: captchaResult.reason };
      }

      // 唯一約束是最終的併發安全邊界；conflict 與 created 皆回傳相同泛化成功結果
      await deps.writeRepo.create({ name: validation.value.name, email: validation.value.email });
      return GENERIC_SUBSCRIBE_SUCCESS;
    },

    /**
     * 後台唯讀訂閱者名單：有界分頁、姓名/Email 搜尋，回傳只含必要欄位的安全 DTO。
     */
    async listSubscribers(params: { search?: string; page?: number; pageSize?: number }): Promise<SubscriberListPage> {
      if (!deps.listRepo) {
        throw new Error("listRepo is not configured for this NewsletterUseCases instance");
      }

      // 先夾限一次，查詢與回傳共用同一組實際生效的分頁參數，避免 API 誠實性落差。
      const page = clampPage(params.page);
      const pageSize = clampPageSize(params.pageSize);

      const trimmedSearch = params.search?.trim();
      const result = await deps.listRepo.list({
        search: trimmedSearch ? trimmedSearch : undefined,
        page,
        pageSize,
      });

      return {
        items: result.items.map(toSafeListItem),
        total: result.total,
        page,
        pageSize,
      };
    },

    /** 計算近 7／30 天新增訂閱者 aggregate，不回傳任何訂閱者個資。 */
    async countSubscriberGrowth(now = new Date()) {
      if (!deps.listRepo?.countGrowth) {
        throw new Error("countGrowth is not configured for this NewsletterUseCases instance");
      }
      return deps.listRepo.countGrowth({
        since7Days: new Date(now.getTime() - 7 * 86_400_000),
        since30Days: new Date(now.getTime() - 30 * 86_400_000),
      });
    },
  };
}
