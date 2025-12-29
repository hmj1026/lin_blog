"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { type ApiResponse, parseApiResponse } from "@/lib/api-client";

type Row = {
  id: string;
  email: string;
  name: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  deletedAt: string | null;
};

export function UserAdminClient({
  initialUsers,
  roles,
}: {
  initialUsers: Row[];
  roles: Array<{ id: string; key: string; name: string }>;
}) {
  const [rows, setRows] = useState<Row[]>(initialUsers);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRoleId, setNewRoleId] = useState<string>(() => roles.find((r) => r.key === "EDITOR")?.id ?? roles[0]?.id ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeRows = useMemo(() => rows.filter((r) => r.deletedAt == null), [rows]);

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function create() {
    setSaving(true);
    setMessage(null);
    try {
      if (!isValidEmail(newEmail.trim())) throw new Error("Email 格式不正確");
      if (!newRoleId) throw new Error("請選擇角色");
      if (newPassword.length < 6) throw new Error("密碼至少 6 字");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          name: newName.trim() || undefined,
          roleId: newRoleId,
          password: newPassword,
        }),
      });
      const json = await parseApiResponse<Row>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "新增失敗" : "新增失敗");
      setRows((prev) => [json.data, ...prev]);
      setNewEmail("");
      setNewName("");
      setNewRoleId(roles.find((r) => r.key === "EDITOR")?.id ?? roles[0]?.id ?? "");
      setNewPassword("");
      setMessage("已新增");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "新增失敗");
    } finally {
      setSaving(false);
    }
  }

  async function update(row: Row, password?: string) {
    setSaving(true);
    setMessage(null);
    try {
      if (!isValidEmail(row.email.trim())) throw new Error("Email 格式不正確");
      if (!row.roleId) throw new Error("請選擇角色");
      if (password && password.trim().length > 0 && password.trim().length < 6) throw new Error("密碼至少 6 字");
      const res = await fetch(`/api/users/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: row.email.trim(),
          name: row.name ?? undefined,
          roleId: row.roleId,
          password: password?.trim() ? password.trim() : undefined,
        }),
      });
      const json = await parseApiResponse<Row>(res);
      if (!res.ok || !json.success) throw new Error(!json.success ? json.message || "更新失敗" : "更新失敗");
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...json.data } : r)));
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
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await parseApiResponse<Row>(res);
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
      <section className="grid gap-3 md:grid-cols-4">
        <input
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
          placeholder="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <input
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
          placeholder="名稱（可空）"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <RoleSelect value={newRoleId} onChange={setNewRoleId} roles={roles} />
        <input
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
          placeholder="密碼（至少 6 字）"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <div className="md:col-span-4 flex justify-end">
          <Button type="button" onClick={create} disabled={saving || !newEmail.trim() || !newRoleId || newPassword.length < 6}>
            新增使用者
          </Button>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="min-w-full text-sm">
          <thead className="bg-base-100 text-left text-base-300">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">名稱</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">重設密碼</th>
              <th className="px-4 py-3">動作</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row) => (
              <UserRow
                key={row.id}
                row={row}
                roles={roles}
                saving={saving}
                onChange={(next) => setRows((prev) => prev.map((r) => (r.id === row.id ? next : r)))}
                onSave={update}
                onDelete={() => remove(row.id)}
              />
            ))}
            {activeRows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-base-300">
                  目前沒有使用者
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

function UserRow({
  row,
  roles,
  saving,
  onChange,
  onSave,
  onDelete,
}: {
  row: Row;
  roles: Array<{ id: string; key: string; name: string }>;
  saving: boolean;
  onChange: (row: Row) => void;
  onSave: (row: Row, password?: string) => void;
  onDelete: () => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <tr className="border-t border-line">
      <td className="px-4 py-3">
        <input
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
          value={row.email}
          onChange={(e) => onChange({ ...row, email: e.target.value })}
        />
      </td>
      <td className="px-4 py-3">
        <input
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
          value={row.name ?? ""}
          onChange={(e) => onChange({ ...row, name: e.target.value })}
        />
      </td>
      <td className="px-4 py-3">
        <RoleSelect
          value={row.roleId}
          onChange={(roleId) => {
            const role = roles.find((r) => r.id === roleId);
            if (!role) return;
            onChange({ ...row, roleId: role.id, roleKey: role.key, roleName: role.name });
          }}
          roles={roles}
        />
      </td>
      <td className="px-4 py-3">
        <input
          className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
          placeholder="留空不改"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving}
            onClick={() => {
              onSave(row, password);
              setPassword("");
            }}
          >
            儲存
          </Button>
          <Button type="button" size="sm" variant="danger" disabled={saving} onClick={onDelete}>
            刪除
          </Button>
        </div>
      </td>
    </tr>
  );
}

function RoleSelect({
  value,
  onChange,
  roles,
}: {
  value: string;
  onChange: (roleId: string) => void;
  roles: Array<{ id: string; key: string; name: string }>;
}) {
  return (
    <select
      className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        選擇角色
      </option>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name} ({role.key})
        </option>
      ))}
    </select>
  );
}
