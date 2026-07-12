import { DiscoveryModuleContainer } from "./discovery-module-container";
import type { DiscoverySectionState } from "./types";

type PostDiscoveryPanelVariant = "sidebar" | "stacked" | "grid";

type PostDiscoveryPanelProps = {
  variant: PostDiscoveryPanelVariant;
  popular: DiscoverySectionState;
  latest: DiscoverySectionState;
};

/**
 * 文章詳情頁的探索版面容器，依 `variant` 決定容器樣式，內容一律共用
 * {@link DiscoveryModuleContainer}（搜尋 → 訂閱 → 熱門 → 最新，design.md D1）。
 *
 * - `sidebar`：一般文章桌面版右側欄，sticky 於 header 下方（`top-24`），寬度落在
 *   280–320px 區間（`w-[280px]`），並以 `max-h` + `overflow-y-auto` 確保內容超出
 *   viewport 時仍可捲動閱讀、不截斷可聚焦內容；只在 `lg` 以上斷點顯示。
 * - `stacked`：手機／平板版，於文章內容後方以全寬區塊呈現，不使用 sticky 或
 *   固定寬度，只在 `lg` 以下斷點顯示。
 * - `grid`：`allowRawHtml` 寬版文章專用，於 iframe 後方以獨立的 responsive grid
 *   呈現，不進入雙欄 grid、不限縮 iframe 寬度。
 */
export function PostDiscoveryPanel({ variant, popular, latest }: PostDiscoveryPanelProps) {
  if (variant === "grid") {
    return (
      <div className="section-shell grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DiscoveryModuleContainer popular={popular} latest={latest} layout="grid" />
      </div>
    );
  }

  const className =
    variant === "sidebar"
      ? "hidden space-y-6 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)] lg:w-[280px] lg:overflow-y-auto lg:overflow-x-hidden"
      : "section-shell space-y-6 lg:hidden";

  return (
    <div className={className}>
      <DiscoveryModuleContainer popular={popular} latest={latest} />
    </div>
  );
}
