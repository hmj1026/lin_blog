"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  showInNav: boolean;
  navOrder: number;
};

type Props = {
  initialShowBlogLink: boolean;
  initialCategories: CategoryRow[];
};

type ApiResponse<T> = { success: true; data: T } | { success: false; message?: string; data?: null };

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  const json = (await res.json()) as ApiResponse<T>;
  return json;
}

export function SiteSettingsForm({ initialShowBlogLink, initialCategories }: Props) {
  const [showBlogLink, setShowBlogLink] = useState(initialShowBlogLink);
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => (a.navOrder - b.navOrder) || a.name.localeCompare(b.name, "zh-Hant")),
    [categories]
  );

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const settingsRes = await fetch("/api/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showBlogLink }),
      });
      const settingsJson = await parseJson<unknown>(settingsRes);
      if (!settingsRes.ok || !settingsJson.success) {
        throw new Error(!settingsJson.success ? settingsJson.message || "更新站點設定失敗" : "更新站點設定失敗");
      }

      const results = await Promise.all(
        categories.map((category) =>
          fetch(`/api/categories/${category.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: category.slug, name: category.name, showInNav: category.showInNav, navOrder: category.navOrder }),
          })
        )
      );
      for (const res of results) {
        const json = await parseJson<unknown>(res);
        if (!res.ok || !json.success) {
          throw new Error(!json.success ? json.message || "更新分類設定失敗" : "更新分類設定失敗");
        }
      }
      setMessage("已儲存");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-card">
      <section className="space-y-3">
        <h2 className="font-semibold text-primary">導覽列</h2>
        <label className="flex items-center gap-3 text-sm text-primary">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={showBlogLink}
            onChange={(e) => setShowBlogLink(e.target.checked)}
          />
          顯示「部落格」連結
        </label>
        <p className="text-xs text-base-300">關閉時只隱藏導覽列連結，不會阻擋路由存取。</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-primary">分類連結</h2>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="min-w-full text-sm">
            <thead className="bg-base-100 text-left text-base-300">
              <tr>
                <th className="px-4 py-3">顯示</th>
                <th className="px-4 py-3">名稱</th>
                <th className="px-4 py-3">排序</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((category) => (
                <tr key={category.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={category.showInNav}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) => (c.id === category.id ? { ...c, showInNav: e.target.checked } : c))
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary">{category.name}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-24 rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
                      value={category.navOrder}
                      onChange={(e) =>
                        setCategories((prev) =>
                          prev.map((c) => {
                            if (c.id !== category.id) return c;
                            const value = Number(e.target.value);
                            return { ...c, navOrder: Number.isFinite(value) ? value : 0 };
                          })
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-base-300">
                    目前沒有分類
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div className="text-sm text-base-300">{message}</div>
        <Button onClick={save} disabled={saving}>
          {saving ? "儲存中..." : "儲存"}
        </Button>
      </div>
    </div>
  );
}
