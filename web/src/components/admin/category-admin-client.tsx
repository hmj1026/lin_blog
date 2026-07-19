"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseApiResponse } from "@/lib/api-client";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { AdminDataTable } from "@/components/admin/admin-data-table";

type Row = {
  id: string;
  slug: string;
  name: string;
  showInNav: boolean;
  navOrder: number;
  postCount: number;
  deletedAt: string | null;
};

export function CategoryAdminClient({ initialCategories }: { initialCategories: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialCategories);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ row: Row; affectedPosts: number } | null>(null);
  const [deletedFeedback, setDeletedFeedback] = useState<{ row: Row; affectedPosts: number } | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name-asc" | "usage-desc" | "nav-order">("nav-order");
  const [showTrash, setShowTrash] = useState(false);
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [pendingMerge, setPendingMerge] = useState<{ source: Row; target: Row } | null>(null);

  const activeOptions = useMemo(() => rows.filter((row) => row.deletedAt == null), [rows]);
  const visibleRows = useMemo(() => rows
    .filter((row) => showTrash ? row.deletedAt != null : row.deletedAt == null)
    .filter((row) => !query.trim() || `${row.name} ${row.slug}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => sort === "usage-desc"
      ? b.postCount - a.postCount || a.name.localeCompare(b.name, "zh-Hant")
      : sort === "name-asc"
        ? a.name.localeCompare(b.name, "zh-Hant")
        : a.navOrder - b.navOrder || a.name.localeCompare(b.name, "zh-Hant")),
  [rows, showTrash, query, sort]);

  async function create() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newSlug.trim(), name: newName.trim(), showInNav: false, navOrder: 0 }),
      });
      const json = await parseApiResponse<Row>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "新增失敗" : "新增失敗");
      setRows((prev) => [{ ...json.data, postCount: 0, deletedAt: null }, ...prev]);
      setNewSlug("");
      setNewName("");
      setMessage("已新增");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "新增失敗");
    } finally {
      setSaving(false);
    }
  }

  async function update(row: Row) {
    setSaving(true);
    setMessage(null);
    try {
      if (!row.slug.trim() || !row.name.trim()) {
        throw new Error("請填寫 slug 與名稱");
      }
      const res = await fetch(`/api/categories/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: row.slug, name: row.name, showInNav: row.showInNav, navOrder: row.navOrder }),
      });
      const json = await parseApiResponse<Row>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "更新失敗" : "更新失敗");
      setMessage("已更新");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  }

  async function requestRemove(row: Row) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/categories/${row.id}`, { method: "GET" });
      const json = await parseApiResponse<{ affectedPosts: number }>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "無法取得刪除影響" : "無法取得刪除影響");
      setPendingDelete({ row, affectedPosts: json.data.affectedPosts });
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "無法取得刪除影響");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/categories/${pendingDelete.row.id}`, { method: "DELETE" });
      const json = await parseApiResponse<Row & { affectedPosts: number }>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "刪除失敗" : "刪除失敗");
      setRows((prev) => prev.map((r) => (r.id === pendingDelete.row.id ? { ...r, deletedAt: new Date().toISOString() } : r)));
      setDeletedFeedback({ row: pendingDelete.row, affectedPosts: json.data.affectedPosts });
      setPendingDelete(null);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setSaving(false);
    }
  }

  async function restore(row = deletedFeedback?.row) {
    if (!row) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${row.id}`, { method: "PATCH" });
      const json = await parseApiResponse<{ id: string }>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "復原失敗" : "復原失敗");
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, deletedAt: null } : item)));
      setDeletedFeedback(null);
      setMessage("已復原分類");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "復原失敗");
    } finally {
      setSaving(false);
    }
  }

  async function merge() {
    if (!pendingMerge) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${pendingMerge.source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergeIntoId: pendingMerge.target.id }),
      });
      const json = await parseApiResponse<{ id: string; movedPosts: number }>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "合併失敗" : "合併失敗");
      setRows((previous) => previous.map((row) => row.id === pendingMerge.source.id
        ? { ...row, deletedAt: new Date().toISOString(), showInNav: false }
        : row.id === pendingMerge.target.id ? { ...row, postCount: row.postCount + json.data.movedPosts } : row));
      setMessage(`已合併 ${json.data.movedPosts} 篇文章關聯`);
      setPendingMerge(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "合併失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-card">
      <section className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1 text-sm font-semibold text-primary">
          新分類 Slug
          <input className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary" placeholder="slug（例如：策略）" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-primary">
          新分類名稱
          <input className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary" placeholder="名稱（例如：策略）" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <Button type="button" onClick={create} disabled={saving || !newSlug.trim() || !newName.trim()}>
          新增
        </Button>
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold">搜尋分類<input type="search" aria-label="搜尋分類" value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-semibold">分類排序<select aria-label="分類排序" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-xl border border-line px-3 py-2"><option value="nav-order">導覽排序</option><option value="name-asc">名稱</option><option value="usage-desc">文章數</option></select></label>
        <Button type="button" variant="secondary" onClick={() => setShowTrash((value) => !value)}>{showTrash ? "返回分類" : "垃圾桶"}</Button>
      </div>

      <AdminDataTable ariaLabel="分類管理資料表">
          <thead className="bg-base-100 text-left text-base-300">
            <tr>
              <th className="px-4 py-3">顯示</th>
              <th className="px-4 py-3">名稱</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">排序</th>
              <th className="px-4 py-3">使用量</th>
              <th className="px-4 py-3">動作</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`${row.name} 顯示於導覽`}
                    className="h-4 w-4 accent-primary"
                    checked={row.showInNav}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, showInNav: e.target.checked } : r)))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                    aria-label={`${row.name} 名稱`}
                    value={row.name}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                    aria-label={`${row.name} Slug`}
                    value={row.slug}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, slug: e.target.value } : r)))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    aria-label={`${row.name} 導覽排序`}
                    className="w-24 rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                    value={row.navOrder}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r) => {
                          if (r.id !== row.id) return r;
                          const value = Number(e.target.value);
                          return { ...r, navOrder: Number.isFinite(value) ? value : 0 };
                        })
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3">{row.postCount} 篇文章</td>
                <td className="px-4 py-3">
                  {showTrash ? <Button type="button" size="sm" onClick={() => restore(row)} aria-label={`復原 ${row.name}`}>復原</Button> : <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => update(row)}>
                      儲存
                    </Button>
                    <Button type="button" size="sm" variant="danger" disabled={saving} onClick={() => requestRemove(row)}>
                      刪除
                    </Button>
                    <select aria-label={`${row.name} 合併目標`} value={mergeTargets[row.id] ?? ""} onChange={(event) => setMergeTargets((previous) => ({ ...previous, [row.id]: event.target.value }))} className="rounded-lg border border-line px-2 py-2 text-sm"><option value="">合併至…</option>{activeOptions.filter((target) => target.id !== row.id).map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select>
                    <Button type="button" size="sm" variant="secondary" disabled={!mergeTargets[row.id] || saving} aria-label={`合併 ${row.name}`} onClick={() => { const target = activeOptions.find((item) => item.id === mergeTargets[row.id]); if (target) setPendingMerge({ source: row, target }); }}>合併</Button>
                  </div>}
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-base-300">
                  目前沒有分類
                </td>
              </tr>
            )}
          </tbody>
      </AdminDataTable>

      <div className="text-sm text-base-300">{message}</div>
      {deletedFeedback ? (
        <AdminFeedback
          tone="success"
          message={`已刪除「${deletedFeedback.row.name}」，${deletedFeedback.affectedPosts} 篇文章仍會保留。`}
          onRetry={() => restore()}
          retryLabel="復原"
        />
      ) : null}
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="確認刪除分類"
        description={
          pendingDelete
            ? `「${pendingDelete.row.name}」目前用於 ${pendingDelete.affectedPosts} 篇文章。刪除分類不會刪除文章。`
            : ""
        }
        confirmLabel="確認刪除"
        pending={saving}
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmationDialog open={Boolean(pendingMerge)} title="確認合併分類" description={pendingMerge ? `將「${pendingMerge.source.name}」的文章關聯移至「${pendingMerge.target.name}」，來源分類會移入垃圾桶。` : ""} confirmLabel="確認合併" pending={saving} onConfirm={merge} onCancel={() => setPendingMerge(null)} />
    </div>
  );
}
