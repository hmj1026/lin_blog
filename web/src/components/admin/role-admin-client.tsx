"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { parseApiResponse } from "@/lib/api-client";
import { PERMISSION_DEPENDENCIES, permissionDependencyViolations } from "@/modules/security-admin/client";

type Permission = { key: string; name: string };
type RoleRow = { id: string; key: string; name: string; permissionKeys: string[]; activeUserCount: number };

const PERMISSION_GROUPS = [
  { name: "基礎存取", prefixes: ["admin:"] },
  { name: "內容管理", prefixes: ["posts:", "uploads:", "categories:", "tags:"] },
  { name: "洞察與資料", prefixes: ["analytics:", "subscribers:"] },
  { name: "系統管理", prefixes: ["users:", "roles:", "settings:", "audit:"] },
] as const;

/** 依權限語意前綴建立穩定的管理介面功能群組。 */
function groupPermissions(permissions: Permission[]) {
  const matched = new Set<string>();
  const groups = PERMISSION_GROUPS.map((group) => ({
    name: group.name,
    permissions: permissions.filter((permission) => {
      const isMatch = group.prefixes.some((prefix) => permission.key.startsWith(prefix));
      if (isMatch) matched.add(permission.key);
      return isMatch;
    }),
  })).filter((group) => group.permissions.length > 0);
  const other = permissions.filter((permission) => !matched.has(permission.key));
  return other.length > 0 ? [...groups, { name: "其他", permissions: other }] : groups;
}

/**
 * 回傳角色目前缺少的權限相依項目，供儲存前阻擋與說明。
 *
 * 明確宣告的相依（{@link PERMISSION_DEPENDENCIES}）沿用與伺服器共用的
 * `permissionDependencyViolations` SSOT，伺服器端亦會強制同一份規則。
 * 另加上一條「任何權限都應搭配 admin:access」的 UI-only UX 護欄：此規則刻意
 * 僅於前端提示、不在伺服器強制——admin:access 由 middleware 控管 /admin 入口，
 * 缺少它的其他權限無法在後台實際使用，故屬 UX 提醒而非安全邊界。
 */
function permissionDependencyIssues(role: RoleRow, permissions: Permission[]) {
  const names = new Map(permissions.map((permission) => [permission.key, permission.name]));
  const describe = (permissionKey: string, requires: string) =>
    `${names.get(permissionKey) ?? permissionKey}需要先啟用${names.get(requires) ?? requires}`;

  const granted = new Set(role.permissionKeys);
  const declaredIssues = permissionDependencyViolations(role.permissionKeys).map((violation) =>
    describe(violation.permissionKey, violation.requires)
  );
  const implicitAdminAccessIssues = role.permissionKeys
    .filter(
      (permissionKey) =>
        permissionKey !== "admin:access" &&
        !PERMISSION_DEPENDENCIES[permissionKey] &&
        !granted.has("admin:access")
    )
    .map((permissionKey) => describe(permissionKey, "admin:access"));

  return [...declaredIssues, ...implicitAdminAccessIssues];
}

function uniq(values: string[]) {
  return Array.from(new Set(values));
}

/**
 * 產生不與現有角色衝突的 key：base 未被占用即回傳，否則附加遞增序號（base_2、base_3…）。
 * 讓連續複製同一角色（base 為 `${key}_COPY`）不會撞唯一 key 而導致第二次複製失敗。
 */
export function uniqueRoleKey(existingKeys: string[], base: string): string {
  const existing = new Set(existingKeys);
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
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
  const [pendingDelete, setPendingDelete] = useState<RoleRow | null>(null);

  const sorted = useMemo(() => [...roles].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")), [roles]);
  const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);

  async function create(template?: RoleRow) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template
          ? { key: uniqueRoleKey(roles.map((role) => role.key), `${template.key}_COPY`), name: `${template.name} 複本`, permissionKeys: template.permissionKeys }
          : { key: uniqueRoleKey(roles.map((role) => role.key), "NEW_ROLE"), name: "新角色", permissionKeys: [] }),
      });
      const json = await parseApiResponse<RoleRow>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "新增失敗" : "新增失敗");
      setRoles((prev) => [{ ...json.data, activeUserCount: 0 }, ...prev]);
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
      const json = await parseApiResponse<RoleRow>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "儲存失敗" : "儲存失敗");
      setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...json.data, activeUserCount: role.activeUserCount } : r)));
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
      const json = await parseApiResponse<{ ok: boolean }>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "刪除失敗" : "刪除失敗");
      setRoles((prev) => prev.filter((r) => r.id !== id));
      setMessage("已刪除");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setSaving(false);
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm text-base-300">變更權限後，使用者需重新登入才會更新 session。</div>
        <Button type="button" onClick={() => create()} disabled={saving}>
          新增角色
        </Button>
      </div>

      <div className="space-y-4">
        {sorted.map((role) => {
          const dependencyIssues = permissionDependencyIssues(role, permissions);
          const capabilityNames = permissions.filter((permission) => role.permissionKeys.includes(permission.key)).map((permission) => permission.name);
          return (
          <div key={role.id} className="rounded-2xl border border-line bg-base-50 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-base-300">
              <span>{role.activeUserCount} 位啟用使用者</span>
              <Button type="button" size="sm" variant="secondary" disabled={saving} aria-label={`以 ${role.name} 為範本新增`} onClick={() => create(role)}>
                複製範本
              </Button>
            </div>
            <p className="text-sm text-base-300">能力摘要：{capabilityNames.length > 0 ? capabilityNames.join("、") : "尚未授予權限"}</p>
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
                <Button type="button" size="sm" variant="secondary" disabled={saving || dependencyIssues.length > 0} onClick={() => save(role)}>
                  儲存
                </Button>
                <Button type="button" size="sm" variant="danger" disabled={saving} onClick={() => setPendingDelete(role)}>
                  刪除
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {permissionGroups.map((group) => <fieldset key={group.name} className="space-y-2 rounded-xl border border-line bg-white p-3">
                <legend className="px-1 text-sm font-semibold text-primary">{group.name}</legend>
                {group.permissions.map((p) => {
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
              </fieldset>)}
            </div>
            {dependencyIssues.length > 0 ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{dependencyIssues.join("；")}</div> : null}
          </div>
        );})}
        {sorted.length === 0 && <div className="text-sm text-base-300">尚無角色</div>}
      </div>

      <div className="text-sm text-base-300">{message}</div>

      <ConfirmationDialog
        open={pendingDelete !== null}
        title="確認刪除角色"
        description={`即將刪除角色「${pendingDelete?.name ?? ""}」。若仍有啟用中的使用者使用此角色，系統會阻擋操作，請先重新指派使用者。`}
        confirmLabel="確認刪除"
        pending={saving}
        onConfirm={() => pendingDelete && remove(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
