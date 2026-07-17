"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

type Subscriber = { id: string; name: string; email: string; createdAt: string };

const PAGE_SIZE = 20;
const GENERIC_ERROR_MESSAGE = "系統發生錯誤，請稍後再試";

/**
 * 後台訂閱者名單（唯讀）。
 *
 * 只顯示姓名/Email/建立時間，支援姓名/Email 搜尋與分頁；
 * 依 Non-Goals 刻意不提供匯出、刪除或群發等寫入操作。
 */
export function SubscriberListClient() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const fetchSubscribers = useCallback(async (search: string, targetPage: number) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      params.set("page", String(targetPage));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/admin/subscribers?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(true);
        return;
      }
      setItems(json.data.items);
      setTotal(json.data.total);
      setPage(json.data.page ?? targetPage);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/admin/subscribers?page=1&pageSize=${PAGE_SIZE}`)
      .then(async (response) => ({ response, json: await response.json() }))
      .then(({ response, json }) => {
        if (ignore) return;
        if (!response.ok || !json.success) {
          setError(true);
          return;
        }
        setItems(json.data.items);
        setTotal(json.data.total);
        setPage(json.data.page ?? 1);
      })
      .catch(() => {
        if (!ignore) setError(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    setLoading(true);
    setError(false);
    setAppliedSearch(trimmed);
    fetchSubscribers(trimmed, 1);
  }

  function goToPage(nextPage: number) {
    setLoading(true);
    setError(false);
    fetchSubscribers(appliedSearch, nextPage);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-primary">訂閱者名單</h1>
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <label htmlFor="subscriber-search" className="sr-only">
            搜尋姓名或 Email
          </label>
          <input
            id="subscriber-search"
            type="search"
            aria-label="搜尋姓名或 Email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="搜尋姓名或 Email..."
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm text-primary placeholder:text-base-300 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-primary hover:border-primary/40"
          >
            搜尋
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-base-300">載入中...</div>
        ) : error ? (
          <div className="flex h-40 items-center justify-center text-base-300">{GENERIC_ERROR_MESSAGE}</div>
        ) : items.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-base-300">
            {appliedSearch ? "找不到符合的訂閱者" : "目前沒有訂閱者"}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="min-w-full text-sm">
              <thead className="bg-base-100 text-left text-base-300">
                <tr>
                  <th className="px-4 py-3">姓名</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">建立時間</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold text-primary">{item.name}</td>
                    <td className="px-4 py-3 text-primary">{item.email}</td>
                    <td className="px-4 py-3 text-base-300">{formatDateTime(new Date(item.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className="mt-4 flex items-center justify-between text-sm font-semibold text-primary">
            <span className="text-base-300">共 {total} 位訂閱者，第 {page} / {totalPages} 頁</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-full border border-line px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                上一頁
              </button>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-full border border-line px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
