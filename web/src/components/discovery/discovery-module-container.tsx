import { NewsletterForm } from "@/components/newsletter-form";
import { PostMiniList } from "./post-mini-list";
import { SiteSearchForm } from "./site-search-form";
import type { DiscoverySectionState } from "./types";

type DiscoveryModuleContainerProps = {
  /** 熱門文章展示狀態（已套用 5 篇上限與 error-isolation） */
  popular: DiscoverySectionState;
  /** 最新文章展示狀態（已套用 5 篇上限與 error-isolation） */
  latest: DiscoverySectionState;
  /**
   * 外層排版策略：`"stack"`（預設）以 `space-y-6` 垂直堆疊四個模組，用於側欄／
   * 堆疊版面；`"grid"` 不包外層容器（直接輸出四個 fragment 子節點），讓呼叫端的
   * responsive grid 容器（見 raw HTML 文章版面）決定欄位排列。
   */
  layout?: "stack" | "grid";
};

const CARD_CLASS = "rounded-2xl border border-line bg-white p-5 shadow-soft dark:bg-base-100 dark:border-base-200";

/**
 * 文章探索模組容器：依序呈現站內搜尋、訂閱、熱門文章、最新文章。
 *
 * 順序固定（design.md D1）：搜尋 → 訂閱 → 熱門 → 最新。每個清單子區塊各自依
 * {@link DiscoverySectionState} 呈現內容／空狀態／泛化錯誤狀態，單一模組失敗
 * 不影響其餘模組（design.md D5 錯誤隔離）。
 */
export function DiscoveryModuleContainer({ popular, latest, layout = "stack" }: DiscoveryModuleContainerProps) {
  const sections = (
    <>
      <div className={CARD_CLASS}>
        <SiteSearchForm />
      </div>
      <NewsletterForm compact />
      <div className={CARD_CLASS}>
        <PostMiniList title="熱門文章" state={popular} emptyMessage="目前沒有熱門文章。" />
      </div>
      <div className={CARD_CLASS}>
        <PostMiniList title="最新文章" state={latest} emptyMessage="目前沒有最新文章。" />
      </div>
    </>
  );

  if (layout === "grid") return sections;
  return <div className="space-y-6">{sections}</div>;
}
