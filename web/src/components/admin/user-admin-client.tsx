"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { AdminTable } from "@/components/admin/table";
import { parseApiResponse, isApiSuccess, getApiErrorMessage } from "@/lib/api-client";

type Row = { id: string; email: string; name: string | null; roleId: string; roleKey: string; roleName: string; deletedAt: string | null };
type Role = { id: string; key: string; name: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 使用者搜尋列表與獨立編輯面板，將身份、角色、密碼及停用操作明確分離。 */
export function UserAdminClient({ initialUsers, roles }: { initialUsers: Row[]; roles: Role[] }) {
  const [rows, setRows] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Row | null>(null);
  const [newPasswordForSelected, setNewPasswordForSelected] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRoleId, setNewRoleId] = useState(() => roles.find((role) => role.key === "EDITOR")?.id ?? roles[0]?.id ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDisable, setPendingDisable] = useState<Row | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesText = !normalized || row.email.toLowerCase().includes(normalized) || (row.name ?? "").toLowerCase().includes(normalized);
      return matchesText && (!roleFilter || row.roleId === roleFilter);
    });
  }, [query, roleFilter, rows]);

  const selectRow = (row: Row) => {
    selectedIdRef.current = row.id;
    setSelected(row);
    setDraft({ ...row });
    setNewPasswordForSelected("");
    setMessage(null);
  };

  const createUser = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (!isValidEmail(newEmail.trim())) throw new Error("Email 格式不正確");
      if (newPassword.length < 6) throw new Error("密碼至少 6 字");
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newEmail.trim(), name: newName.trim() || undefined, roleId: newRoleId, password: newPassword }) });
      const json = await parseApiResponse<Row>(response);
      if (!isApiSuccess(response, json)) throw new Error(getApiErrorMessage(json, "新增失敗"));
      setRows((current) => [json.data, ...current]);
      setNewEmail(""); setNewName(""); setNewPassword("");
      setMessage("已新增使用者");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "新增失敗");
    } finally {
      setSaving(false);
    }
  };

  const updateSelected = async (operation: "identity" | "role" | "password") => {
    if (!draft || !selected) return;
    const rowId = draft.id;
    setSaving(true);
    setMessage(null);
    try {
      // 每個操作僅提交自己負責的欄位，其餘一律沿用已持久化的 selected 值：
      // 避免角色下拉或身份欄位的未儲存草稿，被「儲存基本資料」或「重設密碼」意外一併提交。
      const persisted = { email: selected.email.trim(), name: selected.name?.trim() || undefined, roleId: selected.roleId };
      let payload: { email: string; name?: string; roleId: string; password?: string };
      if (operation === "identity") {
        if (!isValidEmail(draft.email.trim())) throw new Error("Email 格式不正確");
        payload = { ...persisted, email: draft.email.trim(), name: draft.name?.trim() || undefined };
      } else if (operation === "role") {
        payload = { ...persisted, roleId: draft.roleId };
      } else {
        payload = { ...persisted, password: newPasswordForSelected };
      }
      const response = await fetch(`/api/users/${draft.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await parseApiResponse<Row>(response);
      if (!isApiSuccess(response, json)) throw new Error(getApiErrorMessage(json, "更新失敗"));
      // 僅套用本次操作實際變更的欄位：role/password 回應仍帶著 persisted 的 email/name，
      // 全量合併會把使用者尚未儲存的身份欄位草稿覆蓋回舊值。
      const next: Row =
        operation === "identity"
          ? { ...draft, ...json.data }
          : operation === "role"
            ? { ...draft, roleId: json.data.roleId, roleKey: json.data.roleKey, roleName: json.data.roleName }
            : draft;
      setRows((current) => current.map((row) => row.id === next.id ? next : row));
      // 請求進行中使用者可能已切換到別的使用者列——selectedIdRef 由 selectRow/disableSelected
      // 同步維護，於此同步比對是否仍是本次更新的那一列，避免用過時結果覆蓋切換後的畫面。
      // （functional updater 的執行時機由 React 排程決定，不保證在這裡同步跑完，不可靠。）
      if (selectedIdRef.current === rowId) {
        setSelected(next);
        setDraft(next);
        setNewPasswordForSelected("");
      }
      setMessage(operation === "identity" ? "基本資料已更新" : operation === "role" ? "角色已更新" : "密碼已重設");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失敗");
    } finally {
      setSaving(false);
    }
  };

  const disableSelected = async () => {
    if (!pendingDisable) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/users/${pendingDisable.id}`, { method: "DELETE" });
      const json = await parseApiResponse<Row>(response);
      if (!isApiSuccess(response, json)) throw new Error(getApiErrorMessage(json, "停用失敗"));
      const deletedAt = json.data.deletedAt ?? new Date().toISOString();
      setRows((current) => current.map((row) => row.id === pendingDisable.id ? { ...row, deletedAt } : row));
      if (selectedIdRef.current === pendingDisable.id) selectedIdRef.current = null;
      setSelected(null); setDraft(null); setMessage("帳號已停用");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "停用失敗");
    } finally {
      setSaving(false); setPendingDisable(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-2xl border border-line bg-white p-6 shadow-card md:grid-cols-4" aria-label="新增使用者">
        <label className="grid gap-1 text-sm font-semibold">新使用者 Email<input aria-label="新使用者 Email" className="rounded-xl border border-line px-4 py-3" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></label>
        <label className="grid gap-1 text-sm font-semibold">名稱<input aria-label="新使用者名稱" className="rounded-xl border border-line px-4 py-3" value={newName} onChange={(event) => setNewName(event.target.value)} /></label>
        <label className="grid gap-1 text-sm font-semibold">初始角色<RoleSelect ariaLabel="初始角色" value={newRoleId} roles={roles} onChange={setNewRoleId} /></label>
        <label className="grid gap-1 text-sm font-semibold">初始密碼<input aria-label="初始密碼" type="password" className="rounded-xl border border-line px-4 py-3" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <div className="flex justify-end md:col-span-4"><Button type="button" disabled={saving || !newEmail.trim() || !newRoleId || newPassword.length < 6} onClick={createUser}>新增使用者</Button></div>
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card" aria-label="使用者列表">
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1 text-sm font-semibold">搜尋使用者<input type="search" aria-label="搜尋使用者" className="rounded-xl border border-line px-4 py-2" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="grid gap-1 text-sm font-semibold">角色篩選<select aria-label="角色篩選" className="rounded-xl border border-line px-4 py-2" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">所有角色</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        </div>
        <AdminTable ariaLabel="使用者管理資料表">
          <thead className="bg-base-100 text-left text-base-300"><tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">名稱</th><th className="px-4 py-3">角色</th><th className="px-4 py-3">狀態</th><th className="px-4 py-3">操作</th></tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-line"><td className="px-4 py-3">{row.email}</td><td className="px-4 py-3">{row.name || "—"}</td><td className="px-4 py-3">{row.roleName}</td><td className="px-4 py-3">{row.deletedAt ? "已停用" : "啟用中"}</td><td className="px-4 py-3"><Button type="button" size="sm" variant="secondary" aria-label="編輯使用者" onClick={() => selectRow(row)}>編輯</Button></td></tr>)}{visibleRows.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-base-300">找不到符合的使用者</td></tr> : null}</tbody>
        </AdminTable>
      </section>

      {draft ? <section role="region" aria-label={`編輯 ${selected?.email ?? draft.email}`} className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold text-primary">編輯使用者</h2>
        <div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Email<input aria-label="使用者 Email" disabled={saving} className="rounded-xl border border-line px-4 py-2" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label className="grid gap-1 text-sm font-semibold">名稱<input aria-label="使用者名稱" disabled={saving} className="rounded-xl border border-line px-4 py-2" value={draft.name ?? ""} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label></div>
        <Button type="button" disabled={saving} onClick={() => updateSelected("identity")}>儲存基本資料</Button>
        <div className="border-t border-line pt-5"><label className="grid max-w-md gap-1 text-sm font-semibold">指派角色<RoleSelect ariaLabel="指派角色" value={draft.roleId} roles={roles} disabled={saving} onChange={(roleId) => { const role = roles.find((item) => item.id === roleId); if (role) setDraft({ ...draft, roleId, roleKey: role.key, roleName: role.name }); }} /></label><Button className="mt-3" type="button" variant="secondary" disabled={saving} onClick={() => updateSelected("role")}>更新角色</Button></div>
        <div className="border-t border-line pt-5"><label className="grid max-w-md gap-1 text-sm font-semibold">新密碼<input aria-label="新密碼" type="password" disabled={saving} className="rounded-xl border border-line px-4 py-2" value={newPasswordForSelected} onChange={(event) => setNewPasswordForSelected(event.target.value)} /></label><Button className="mt-3" type="button" variant="secondary" disabled={saving || newPasswordForSelected.length < 6} onClick={() => updateSelected("password")}>重設密碼</Button></div>
        {!draft.deletedAt ? <div className="border-t border-line pt-5"><Button type="button" variant="danger" disabled={saving} onClick={() => setPendingDisable(draft)}>停用帳號</Button></div> : <p className="border-t border-line pt-5 text-sm text-base-300">此帳號已停用。</p>}
      </section> : null}

      {message ? <div role="status" className="text-sm text-base-300">{message}</div> : null}
      <ConfirmationDialog open={Boolean(pendingDisable)} title="確認停用使用者" description={pendingDisable ? `即將停用 ${pendingDisable.email}（角色：${pendingDisable.roleName}）。該帳號之後將無法登入；若這會移除最後一位管理員，系統會阻擋操作。` : ""} confirmLabel="確認停用" pending={saving} onConfirm={disableSelected} onCancel={() => setPendingDisable(null)} />
    </div>
  );
}

function RoleSelect({ value, onChange, roles, ariaLabel, disabled }: { value: string; onChange: (roleId: string) => void; roles: Role[]; ariaLabel: string; disabled?: boolean }) {
  return <select aria-label={ariaLabel} disabled={disabled} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-primary" value={value} onChange={(event) => onChange(event.target.value)}><option value="" disabled>選擇角色</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name} ({role.key})</option>)}</select>;
}
