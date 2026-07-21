"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { AdminTable } from "@/components/admin/table";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { Pagination } from "@/components/pagination";
import { Button, buttonStyles } from "@/components/ui/button";

type Subscriber = { id: string; name: string; email: string; createdAt: string };
type Props = {
  items: readonly Subscriber[];
  filters: { search: string };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  growth: { last7Days: number; last30Days: number };
  loadError?: boolean;
};

/** 唯讀訂閱者名單：URL 查詢、aggregate growth、單筆 Email 複製與可重試錯誤。 */
export function SubscriberListClient({ items, filters, pagination, growth, loadError = false }: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryParams = { ...(filters.search ? { q: filters.search } : {}), pageSize: String(pagination.pageSize) };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-primary">訂閱者名單</h1>
        <form method="get" className="flex flex-wrap items-end gap-2" aria-label="訂閱者搜尋">
          <label className="grid gap-1 text-sm font-semibold text-primary">搜尋姓名或 Email<input name="q" type="search" aria-label="搜尋姓名或 Email" defaultValue={filters.search} placeholder="搜尋姓名或 Email..." className="rounded-xl border border-line bg-white px-4 py-2 text-sm" /></label>
          <input type="hidden" name="pageSize" value={pagination.pageSize} />
          <Button type="submit">搜尋</Button>
          <Link href="/admin/subscribers" className={buttonStyles({ variant: "ghost" })}>清除</Link>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <p className="rounded-xl border border-line bg-white p-4 font-semibold text-primary">近 7 天新增 {growth.last7Days} 位</p>
        <p className="rounded-xl border border-line bg-white p-4 font-semibold text-primary">近 30 天新增 {growth.last30Days} 位</p>
      </div>
      {feedback ? <AdminFeedback tone="success" message={feedback} /> : null}

      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        {loadError ? (
          <AdminFeedback tone="error" message="系統發生錯誤，請稍後再試" retryLabel="重新載入" onRetry={() => router.refresh()} />
        ) : items.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-base-300">{filters.search ? "找不到符合的訂閱者" : "目前沒有訂閱者"}</div>
        ) : (
          <AdminTable ariaLabel="訂閱者名單資料表">
            <thead className="bg-base-100 text-left text-base-300"><tr><th className="px-4 py-3">姓名</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">建立時間</th><th className="px-4 py-3">操作</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id} className="border-t border-line"><td className="px-4 py-3 font-semibold text-primary">{item.name}</td><td className="px-4 py-3 text-primary">{item.email}</td><td className="px-4 py-3 text-base-300">{formatDateTime(new Date(item.createdAt))}</td><td className="px-4 py-3"><Button size="sm" variant="secondary" aria-label={`複製 ${item.email} Email`} onClick={async () => { await navigator.clipboard.writeText(item.email); setFeedback(`已複製「${item.email}」。`); }}>複製 Email</Button></td></tr>)}</tbody>
          </AdminTable>
        )}
        {!loadError ? <div className="mt-4 space-y-4"><p className="text-sm text-base-300">共 {pagination.total} 位訂閱者，第 {pagination.page} / {pagination.totalPages} 頁</p><Pagination currentPage={pagination.page} totalPages={pagination.totalPages} baseUrl="/admin/subscribers" queryParams={queryParams} /></div> : null}
      </div>
    </div>
  );
}
