import { Suspense } from "react";
import { discoveryQueries } from "@/lib/server-queries";
import { PostDiscoveryPanel } from "./post-discovery-panel";
import { toDiscoverySectionState } from "./types";

type StreamedPostDiscoveryPanelProps = {
  variant: "sidebar" | "stacked" | "grid";
};

/**
 * 探索資料的 async server component：熱門／最新查詢在此等待，
 * 不阻塞文章主內容（查詢已由 server-queries 隔離錯誤並以 React cache
 * 在同一請求內去重，三個 variant 共用同一份資料）。
 */
async function PostDiscoveryPanelLoader({ variant }: StreamedPostDiscoveryPanelProps) {
  const [popularResult, latestResult] = await Promise.all([
    discoveryQueries.listPopularPosts(),
    discoveryQueries.listLatestPosts(),
  ]);

  return (
    <PostDiscoveryPanel
      variant={variant}
      popular={toDiscoverySectionState(popularResult)}
      latest={toDiscoverySectionState(latestResult)}
    />
  );
}

/**
 * 單一探索模組區塊的 skeleton。高度近似 DiscoveryModuleContainer 內對應卡片：
 * 搜尋/訂閱卡片較矮，熱門/最新清單卡片以 5 筆滿載（DISCOVERY_SECTION_MAX_ITEMS）估算，
 * 避免串流補上時推擠下方內容（CLS）。
 */
function DiscoverySectionSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div
      aria-hidden
      className={`${tall ? "min-h-[16rem]" : "min-h-[10rem]"} animate-pulse rounded-2xl border border-line bg-white/60 dark:bg-base-100/60`}
    />
  );
}

/** 四個探索模組（搜尋、訂閱、熱門、最新）的 skeleton 組合，順序與實際模組一致。 */
function DiscoverySectionSkeletons() {
  return (
    <>
      <DiscoverySectionSkeleton />
      <DiscoverySectionSkeleton />
      <DiscoverySectionSkeleton tall />
      <DiscoverySectionSkeleton tall />
    </>
  );
}

/**
 * Suspense fallback：外層容器 class 與 {@link PostDiscoveryPanel} 各 variant 一致，
 * 以 skeleton 預留探索面板的版面空間，避免串流補上時推擠下方內容（CLS）。
 */
function PostDiscoveryPanelFallback({ variant }: StreamedPostDiscoveryPanelProps) {
  if (variant === "grid") {
    return (
      <div className="section-shell grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4" aria-hidden>
        <DiscoverySectionSkeletons />
      </div>
    );
  }

  const className =
    variant === "sidebar"
      ? "hidden space-y-6 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)] lg:w-[280px] lg:overflow-y-auto lg:overflow-x-hidden"
      : "section-shell space-y-6 lg:hidden";

  return (
    <div className={className} aria-hidden>
      <DiscoverySectionSkeletons />
    </div>
  );
}

/**
 * 文章詳情頁探索版面的串流版本（design.md D5：文章主內容優先、探索模組
 * 獨立載入）。以 Suspense 包住資料載入，文章 JSX 先行送出，探索區塊
 * 於查詢完成後串流補上；查詢失敗只影響本區塊的泛化錯誤狀態。
 */
export function StreamedPostDiscoveryPanel({ variant }: StreamedPostDiscoveryPanelProps) {
  return (
    <Suspense fallback={<PostDiscoveryPanelFallback variant={variant} />}>
      <PostDiscoveryPanelLoader variant={variant} />
    </Suspense>
  );
}
