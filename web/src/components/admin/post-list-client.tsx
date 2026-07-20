"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Pagination } from "@/components/pagination";
import type { AdminPostListParams } from "@/modules/posts";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: string;
  featured: boolean;
  allowRawHtml: boolean;
  showRawHtmlToc: boolean;
  updatedAt: string;
  publishedAt: string | null;
  deletedAt: string | null;
  categories: { name: string }[];
  tags: { name: string }[];
};

type PostListClientProps = {
  posts: Post[];
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  filters?: AdminPostListParams;
  categories?: Array<{ id: string; name: string }>;
  tags?: Array<{ id: string; name: string }>;
  selectionKey?: string;
};

const defaultFilters: AdminPostListParams = {
  deleted: false,
  sort: "updated-desc",
  page: 1,
  pageSize: 20,
};

/** 建立保留目前篩選條件的分頁 query。 */
function toQueryParams(filters: AdminPostListParams): Record<string, string> {
  return Object.fromEntries(Object.entries({
    q: filters.query,
    status: filters.status,
    category: filters.categoryId,
    tag: filters.tagId,
    featured: filters.featured === undefined ? undefined : String(filters.featured),
    view: filters.deleted ? "trash" : undefined,
    sort: filters.sort,
    pageSize: String(filters.pageSize),
  }).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export function PostListClient({
  posts,
  pagination = { page: 1, pageSize: 20, total: posts.length, totalPages: 1 },
  filters = defaultFilters,
  categories = [],
  tags = [],
  selectionKey = "default",
}: PostListClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previousSelectionKey, setPreviousSelectionKey] = useState(selectionKey);
  const [loading, setLoading] = useState(false);
  const [pendingBatchDelete, setPendingBatchDelete] = useState(false);
  const [pendingSingleDelete, setPendingSingleDelete] = useState<Post | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  if (selectionKey !== previousSelectionKey) {
    setPreviousSelectionKey(selectionKey);
    setSelected(new Set());
  }

  const toggleAll = () => {
    setSelected(selected.size === posts.length ? new Set() : new Set(posts.map((post) => post.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  /** 執行批次操作並保留失敗項目，避免成功／失敗被單一 count 掩蓋。 */
  const handleBatch = async (action: "publish" | "draft" | "delete") => {
    if (selected.size === 0) return;
    if (action === "delete" && !pendingBatchDelete) {
      setPendingBatchDelete(true);
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/posts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postIds: Array.from(selected) }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "操作失敗");
      const results = (json.results ?? []) as Array<{ id: string; ok: boolean; error?: "not-applicable" | "failed" }>;
      // 依 API 回傳三分：已達目標狀態（not-applicable）視為「略過」而非失敗，僅真正失敗保留勾選。
      const failed = results.filter((result) => !result.ok && result.error !== "not-applicable").map((result) => result.id);
      const skipped = results.filter((result) => !result.ok && result.error === "not-applicable").length;
      const changed = results.filter((result) => result.ok).length;
      setSelected(new Set(failed));
      if (results.length === 0) {
        setFeedback({ tone: "success", message: json.message || `已完成 ${json.count ?? selected.size} 篇文章。` });
      } else {
        const parts = [`成功 ${changed} 篇`];
        if (skipped > 0) parts.push(`略過 ${skipped} 篇`);
        if (failed.length > 0) parts.push(`失敗 ${failed.length} 篇；失敗項目仍保持選取`);
        setFeedback({ tone: failed.length > 0 ? "error" : "info", message: `${parts.join("，")}。` });
      }
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "操作失敗" });
    } finally {
      setLoading(false);
      setPendingBatchDelete(false);
    }
  };

  /** 執行單篇快速狀態更新。 */
  const patchPost = async (post: Post, payload: Record<string, boolean>, successMessage: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "操作失敗");
      setFeedback({ tone: "success", message: successMessage });
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "操作失敗" });
    } finally {
      setLoading(false);
    }
  };

  /** 確認後軟刪除單篇文章。 */
  const deleteSingle = async () => {
    if (!pendingSingleDelete) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${pendingSingleDelete.id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "刪除失敗");
      setFeedback({ tone: "success", message: `已將「${pendingSingleDelete.title}」移至垃圾桶。` });
      setPendingSingleDelete(null);
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "刪除失敗" });
    } finally {
      setLoading(false);
    }
  };

  const allSelected = posts.length > 0 && selected.size === posts.length;
  const queryParams = toQueryParams(filters);

  return (
    <div className="space-y-4">
      {feedback ? <AdminFeedback tone={feedback.tone} message={feedback.message} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-primary">文章列表</h1>
        <div className="flex items-center gap-2">
          <Link href={filters.deleted ? "/admin/posts" : "/admin/posts?view=trash"} className={buttonStyles({ variant: "secondary" })}>
            {filters.deleted ? "返回文章" : "垃圾桶"}
          </Link>
          <Link href="/admin/posts/new" className={buttonStyles({ variant: "primary" })}>新增文章</Link>
        </div>
      </div>

      <form method="get" className="grid gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-3 lg:grid-cols-7" aria-label="文章篩選">
        <label className="grid gap-1 text-sm font-semibold">搜尋文章<input name="q" type="search" defaultValue={filters.query} placeholder="標題或 slug" className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-semibold">狀態<select name="status" defaultValue={filters.status ?? ""} className="rounded-xl border border-line px-3 py-2"><option value="">全部</option><option value="DRAFT">草稿</option><option value="PUBLISHED">已發佈</option><option value="SCHEDULED">已排程</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">分類<select name="category" defaultValue={filters.categoryId ?? ""} className="rounded-xl border border-line px-3 py-2"><option value="">全部</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">標籤<select name="tag" defaultValue={filters.tagId ?? ""} className="rounded-xl border border-line px-3 py-2"><option value="">全部</option>{tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">精選<select name="featured" defaultValue={filters.featured === undefined ? "" : String(filters.featured)} className="rounded-xl border border-line px-3 py-2"><option value="">全部</option><option value="true">僅精選</option><option value="false">非精選</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">排序<select name="sort" defaultValue={filters.sort} className="rounded-xl border border-line px-3 py-2"><option value="updated-desc">最近更新</option><option value="created-desc">最近建立</option><option value="published-desc">最近發布</option><option value="title-asc">標題 A–Z</option></select></label>
        <input type="hidden" name="view" value={filters.deleted ? "trash" : ""} />
        <div className="flex items-end gap-2"><Button type="submit">套用</Button><Link href={filters.deleted ? "/admin/posts?view=trash" : "/admin/posts"} className={buttonStyles({ variant: "ghost" })}>清除</Link></div>
      </form>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent-500 bg-accent-500/10 px-4 py-3">
          <span className="text-sm font-semibold">已選取 {selected.size} 篇文章</span>
          {!filters.deleted ? <><Button onClick={() => handleBatch("publish")} disabled={loading} size="sm">批次發佈</Button><Button onClick={() => handleBatch("draft")} disabled={loading} size="sm" variant="secondary">設為草稿</Button><Button onClick={() => handleBatch("delete")} disabled={loading} size="sm" variant="danger">批次刪除</Button></> : null}
          <Button onClick={() => setSelected(new Set())} variant="ghost" size="sm">取消選取</Button>
        </div>
      ) : null}

      <p className="text-sm text-base-300">共 {pagination.total} 篇</p>
      <AdminDataTable ariaLabel="文章列表資料表" className="rounded-2xl bg-white shadow-card">
        <thead className="bg-base-100 text-left text-base-300"><tr><th className="w-10 px-4 py-3"><input type="checkbox" aria-label="選取本頁全部文章" checked={allSelected} onChange={toggleAll} /></th><th className="px-4 py-3">精選</th><th className="px-4 py-3">標題</th><th className="px-4 py-3">分類 / 標籤</th><th className="px-4 py-3">狀態</th><th className="px-4 py-3">發布時間</th><th className="px-4 py-3">更新時間</th><th className="px-4 py-3">動作</th></tr></thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className={`border-t border-line ${selected.has(post.id) ? "bg-accent-500/5" : ""}`}>
              <td className="px-4 py-3"><input type="checkbox" aria-label={`選取文章「${post.title}」`} checked={selected.has(post.id)} onChange={() => toggleOne(post.id)} /></td>
              <td className="px-4 py-3">{filters.deleted ? <span aria-hidden="true" className={post.featured ? "text-xl text-yellow-500" : "text-xl text-base-200"}>★</span> : <button type="button" aria-label={post.featured ? `取消精選「${post.title}」` : `設為精選「${post.title}」`} onClick={() => patchPost(post, { featured: !post.featured }, "精選狀態已更新")} disabled={loading} className={post.featured ? "text-xl text-yellow-500" : "text-xl text-base-200"}>★</button>}</td>
              <td className="px-4 py-3 font-semibold text-primary"><span className="inline-flex items-center gap-2">{post.title}{post.allowRawHtml ? <Badge>Raw HTML</Badge> : null}</span><div className="text-xs font-normal text-base-300">/{post.slug}</div></td>
              <td className="px-4 py-3 text-base-300">{post.categories.map((item) => item.name).join("、")} / {post.tags.map((item) => item.name).join("、")}</td>
              <td className="px-4 py-3"><Badge variant={post.status === "PUBLISHED" ? "success" : post.status === "SCHEDULED" ? "info" : "default"}>{post.status === "PUBLISHED" ? "已發佈" : post.status === "SCHEDULED" ? "已排程" : "草稿"}</Badge></td>
              <td className="px-4 py-3 text-base-300">{post.publishedAt ? formatDateTime(new Date(post.publishedAt)) : "未發布"}</td>
              <td className="px-4 py-3 text-base-300">{formatDateTime(new Date(post.updatedAt))}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-2">{filters.deleted ? <Button size="sm" onClick={() => patchPost(post, { restore: true }, `已復原「${post.title}」。`)}>復原</Button> : <><Button variant="outline" size="sm" onClick={() => window.open(`/api/preview?slug=${encodeURIComponent(post.slug)}`, "_blank", "noopener,noreferrer")}>預覽</Button><Link href={`/admin/posts/${post.id}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>編輯</Link><Button variant="danger" size="sm" onClick={() => setPendingSingleDelete(post)}>刪除</Button></>}</div></td>
            </tr>
          ))}
          {posts.length === 0 ? <tr><td colSpan={8} className="px-4 py-6 text-center text-base-300">{filters.deleted ? "垃圾桶目前是空的。" : "找不到符合的文章。"}</td></tr> : null}
        </tbody>
      </AdminDataTable>

      <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} baseUrl="/admin/posts" queryParams={queryParams} />
      <ConfirmationDialog open={pendingBatchDelete} title="確認批次刪除文章" description={`即將刪除 ${selected.size} 篇文章，之後可從垃圾桶復原。`} confirmLabel="確認刪除" pending={loading} onConfirm={() => handleBatch("delete")} onCancel={() => setPendingBatchDelete(false)} />
      <ConfirmationDialog open={Boolean(pendingSingleDelete)} title="確認刪除文章" description={pendingSingleDelete ? `將「${pendingSingleDelete.title}」移至垃圾桶？` : ""} confirmLabel="移至垃圾桶" pending={loading} onConfirm={deleteSingle} onCancel={() => setPendingSingleDelete(null)} />
    </div>
  );
}
