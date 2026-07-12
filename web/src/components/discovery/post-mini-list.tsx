import Link from "next/link";
import { DISCOVERY_SECTION_MAX_ITEMS, type DiscoverySectionState } from "./types";

type PostMiniListProps = {
  /** 區塊標題（例如「熱門文章」「最新文章」） */
  title: string;
  /** 已套用最大筆數上限、error-isolated 的展示狀態 */
  state: DiscoverySectionState;
  /** 無資料時顯示的文案 */
  emptyMessage: string;
};

/**
 * 探索模組的清單子區塊（熱門／最新文章）。
 *
 * 依 `state.status` 獨立呈現內容／空狀態／泛化錯誤狀態，錯誤狀態不洩漏內部細節，
 * 且不影響其他探索模組（design.md D5 錯誤隔離）。列表項目一律以文章 slug 作為
 * React key，確保清單重新排序或部分失敗時仍維持穩定 identity。
 */
export function PostMiniList({ title, state, emptyMessage }: PostMiniListProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-primary">{title}</h3>
      {state.status === "content" && (
        <ul className="space-y-2">
          {state.items.slice(0, DISCOVERY_SECTION_MAX_ITEMS).map((item) => (
            <li key={item.slug}>
              <Link
                href={`/blog/${item.slug}`}
                className="block rounded-lg px-2 py-1.5 text-sm text-base-300 transition hover:bg-base-50 hover:text-primary dark:text-base-500 dark:hover:bg-base-150 dark:hover:text-primary"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {state.status === "empty" && (
        <p className="text-sm text-base-300 dark:text-base-500">{emptyMessage}</p>
      )}
      {state.status === "error" && (
        <p role="status" className="text-sm text-base-300 dark:text-base-500">
          暫時無法載入，請稍後再試。
        </p>
      )}
    </div>
  );
}
