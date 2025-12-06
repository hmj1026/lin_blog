"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  slug: string;
  name: string;
  showInNav: boolean;
  navOrder: number;
  deletedAt: string | null;
};

type ApiResponse<T> = { success: true; data: T } | { success: false; message?: string; data?: null };

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json()) as ApiResponse<T>;
}

export function CategoryAdminClient({ initialCategories }: { initialCategories: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialCategories);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeRows = useMemo(
    () => rows.filter((r) => r.deletedAt == null).sort((a, b) => (a.navOrder - b.navOrder) || a.name.localeCompare(b.name, "zh-Hant")),
    [rows]
  );

  async function create() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newSlug.trim(), name: newName.trim(), showInNav: false, navOrder: 0 }),
      });
      const json = await parseJson<Row>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "新增失敗" : "新增失敗");
      setRows((prev) => [{ ...json.data, deletedAt: null }, ...prev]);
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
      const json = await parseJson<Row>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "更新失敗" : "更新失敗");
      setMessage("已更新");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const json = await parseJson<Row>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "刪除失敗" : "刪除失敗");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r)));
      setMessage("已刪除");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-card">
      <section className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
          placeholder="slug（例如：策略）"
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
        />
        <input
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
          placeholder="名稱（例如：策略）"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="button" onClick={create} disabled={saving || !newSlug.trim() || !newName.trim()}>
          新增
        </Button>
      </section>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="min-w-full text-sm">
          <thead className="bg-base-100 text-left text-base-300">
            <tr>
              <th className="px-4 py-3">顯示</th>
              <th className="px-4 py-3">名稱</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">排序</th>
              <th className="px-4 py-3">動作</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
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
                    value={row.name}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                    value={row.slug}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, slug: e.target.value } : r)))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => update(row)}>
                      儲存
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => remove(row.id)}>
                      刪除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {activeRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-base-300">
                  目前沒有分類
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-base-300">{message}</div>
    </div>
  );
}
