"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Permission = { key: string; name: string };
type RoleRow = { id: string; key: string; name: string; permissionKeys: string[] };
type ApiResponse<T> = { success: true; data: T } | { success: false; message?: string; data?: null };

async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json()) as ApiResponse<T>;
}

function uniq(values: string[]) {
  return Array.from(new Set(values));
}

export function RoleAdminClient({
  permissions,
  initialRoles,
}: {
  permissions: Permission[];
  initialRoles: RoleRow[];
}) {
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sorted = useMemo(() => [...roles].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")), [roles]);

  async function create() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "NEW_ROLE", name: "新角色", permissionKeys: [] }),
      });
      const json = await parseJson<RoleRow>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "新增失敗" : "新增失敗");
      setRoles((prev) => [json.data, ...prev]);
      setMessage("已新增");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "新增失敗");
    } finally {
      setSaving(false);
    }
  }

  async function save(role: RoleRow) {
    setSaving(true);
    setMessage(null);
    try {
      if (!role.key.trim() || !role.name.trim()) throw new Error("請填寫角色 key 與名稱");
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: role.key.trim(),
          name: role.name.trim(),
          permissionKeys: uniq(role.permissionKeys),
        }),
      });
      const json = await parseJson<RoleRow>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "儲存失敗" : "儲存失敗");
      setRoles((prev) => prev.map((r) => (r.id === role.id ? json.data : r)));
      setMessage("已儲存");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      const json = await parseJson<{ ok: boolean }>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "刪除失敗" : "刪除失敗");
      setRoles((prev) => prev.filter((r) => r.id !== id));
      setMessage("已刪除");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm text-base-300">變更權限後，使用者需重新登入才會更新 session。</div>
        <Button type="button" onClick={create} disabled={saving}>
          新增角色
        </Button>
      </div>

      <div className="space-y-4">
        {sorted.map((role) => (
          <div key={role.id} className="rounded-2xl border border-line bg-base-50 p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-primary">名稱</span>
                <input
                  className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
                  value={role.name}
                  onChange={(e) =>
                    setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, name: e.target.value } : r)))
                  }
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-primary">Key</span>
                <input
                  className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
                  value={role.key}
                  onChange={(e) =>
                    setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, key: e.target.value } : r)))
                  }
                />
              </label>
              <div className="flex items-end justify-end gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => save(role)}>
                  儲存
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => remove(role.id)}>
                  刪除
                </Button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {permissions.map((p) => {
                const checked = role.permissionKeys.includes(p.key);
                return (
                  <label key={p.key} className="flex items-center gap-3 text-sm text-primary">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={checked}
                      onChange={(e) =>
                        setRoles((prev) =>
                          prev.map((r) => {
                            if (r.id !== role.id) return r;
                            const next = e.target.checked
                              ? [...r.permissionKeys, p.key]
                              : r.permissionKeys.filter((k) => k !== p.key);
                            return { ...r, permissionKeys: next };
                          })
                        )
                      }
                    />
                    {p.name} <span className="text-xs text-base-300">({p.key})</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {sorted.length === 0 && <div className="text-sm text-base-300">尚無角色</div>}
      </div>

      <div className="text-sm text-base-300">{message}</div>
    </div>
  );
}
