"use client";

import { FormEvent, useId, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRouter } from "next/navigation";

/**
 * 探索模組的站內搜尋表單。
 *
 * 送出時先 trim 查詢字串；空白查詢留在目前文章頁並顯示可存取提示（不導向搜尋頁，
 * 不列出全部文章 —— 見 public-post-discovery spec「Empty query does not list every
 * post」）；非空白查詢導向 `/search?q=<trimmed-and-encoded-query>`。
 */
export function SiteSearchForm() {
  const router = useRouter();
  const inputId = useId();
  const hintId = useId();
  const [query, setQuery] = useState("");
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  // hydration gate：掛載完成前禁用輸入與送出，避免 controlled input 在
  // onChange 附掛前被寫值，導致送出時 React state 仍為 SSR 初始空字串
  const hydrated = useHydrated();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setShowEmptyHint(true);
      return;
    }
    setShowEmptyHint(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-primary">
        站內搜尋
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          disabled={!hydrated}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (showEmptyHint) setShowEmptyHint(false);
          }}
          aria-describedby={showEmptyHint ? hintId : undefined}
          placeholder="輸入關鍵字搜尋..."
          className="w-full rounded-xl border border-line bg-base-50 px-4 py-2.5 text-sm text-primary placeholder:text-base-300 outline-none ring-accent/30 transition focus:border-primary focus:ring dark:bg-base-100"
        />
        <button
          type="submit"
          disabled={!hydrated}
          className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 dark:bg-amber-500 dark:text-stone-900 dark:hover:bg-amber-400"
        >
          搜尋
        </button>
      </div>
      {showEmptyHint && (
        <p id={hintId} role="status" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          請輸入關鍵字後再搜尋。
        </p>
      )}
    </form>
  );
}
