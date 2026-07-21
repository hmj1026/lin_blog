import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserAdminClient } from "@/components/admin/user-admin-client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const roles = [
  { id: "role1", key: "ADMIN", name: "Administrator" },
  { id: "role2", key: "EDITOR", name: "Editor" },
];
const users = [
  { id: "user1", email: "user1@example.com", name: "User One", roleId: "role2", roleKey: "EDITOR", roleName: "Editor", deletedAt: null },
  { id: "user2", email: "admin@example.com", name: "Admin", roleId: "role1", roleKey: "ADMIN", roleName: "Administrator", deletedAt: null },
];

function ok(data: unknown) {
  return { ok: true, json: async () => ({ success: true, data }) };
}

describe("UserAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("依姓名／Email 搜尋並依角色篩選列表", async () => {
    render(<UserAdminClient initialUsers={users} roles={roles} />);

    await userEvent.type(screen.getByRole("searchbox", { name: "搜尋使用者" }), "admin@");
    expect(screen.queryByText("user1@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();

    await userEvent.clear(screen.getByRole("searchbox", { name: "搜尋使用者" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "角色篩選" }), "role2");
    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.queryByText("admin@example.com")).not.toBeInTheDocument();
  });

  it("選取使用者後在獨立面板分開儲存基本資料與角色", async () => {
    fetchMock.mockResolvedValue(ok(users[0]));
    render(<UserAdminClient initialUsers={users} roles={roles} />);
    await userEvent.click(screen.getAllByRole("button", { name: "編輯使用者" })[0]);
    const panel = screen.getByRole("region", { name: "編輯 user1@example.com" });

    expect(within(panel).getByRole("button", { name: "儲存基本資料" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "更新角色" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "重設密碼" })).toBeInTheDocument();

    await userEvent.selectOptions(within(panel).getByRole("combobox", { name: "指派角色" }), "role1");
    await userEvent.click(within(panel).getByRole("button", { name: "更新角色" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/users/user1", expect.objectContaining({ method: "PUT", body: expect.stringContaining('"roleId":"role1"') }));
  });

  it("儲存基本資料不會提交未按『更新角色』的角色草稿", async () => {
    fetchMock.mockResolvedValue(ok(users[0]));
    render(<UserAdminClient initialUsers={users} roles={roles} />);
    await userEvent.click(screen.getAllByRole("button", { name: "編輯使用者" })[0]);
    const panel = screen.getByRole("region", { name: "編輯 user1@example.com" });

    // 在角色下拉調整草稿（role2 → role1），但改按「儲存基本資料」
    await userEvent.selectOptions(within(panel).getByRole("combobox", { name: "指派角色" }), "role1");
    await userEvent.click(within(panel).getByRole("button", { name: "儲存基本資料" }));

    const body = fetchMock.mock.calls[0][1].body as string;
    expect(body).toContain('"roleId":"role2"'); // 沿用已持久化角色，不提交未儲存草稿
    expect(body).not.toContain('"roleId":"role1"');
  });

  it("更新角色不會把尚未儲存的 Email/名稱草稿還原成舊值", async () => {
    fetchMock.mockResolvedValue(ok(users[0]));
    render(<UserAdminClient initialUsers={users} roles={roles} />);
    await userEvent.click(screen.getAllByRole("button", { name: "編輯使用者" })[0]);
    const panel = screen.getByRole("region", { name: "編輯 user1@example.com" });
    const emailInput = within(panel).getByLabelText("使用者 Email");

    // 輸入新 email 但不按「儲存基本資料」，改按「更新角色」；伺服器回應的仍是舊 email。
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "changed@example.com");
    await userEvent.selectOptions(within(panel).getByRole("combobox", { name: "指派角色" }), "role1");
    await userEvent.click(within(panel).getByRole("button", { name: "更新角色" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(emailInput).toHaveValue("changed@example.com");
  });

  it("密碼重設是獨立操作且至少六字", async () => {
    fetchMock.mockResolvedValue(ok(users[0]));
    render(<UserAdminClient initialUsers={users} roles={roles} />);
    await userEvent.click(screen.getAllByRole("button", { name: "編輯使用者" })[0]);
    const panel = screen.getByRole("region", { name: "編輯 user1@example.com" });
    const password = within(panel).getByLabelText("新密碼");

    await userEvent.type(password, "12345");
    expect(within(panel).getByRole("button", { name: "重設密碼" })).toBeDisabled();
    await userEvent.type(password, "6");
    await userEvent.click(within(panel).getByRole("button", { name: "重設密碼" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/users/user1", expect.objectContaining({ body: expect.stringContaining('"password":"123456"') }));
  });

  it("停用維持獨立高風險確認", async () => {
    fetchMock.mockResolvedValue(ok({ ...users[0], deletedAt: new Date().toISOString() }));
    render(<UserAdminClient initialUsers={users} roles={roles} />);
    await userEvent.click(screen.getAllByRole("button", { name: "編輯使用者" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "停用帳號" }));

    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "確認停用" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/users/user1", { method: "DELETE" }));
  });

  it("仍可建立新使用者", async () => {
    fetchMock.mockResolvedValue(ok({ ...users[0], id: "new", email: "new@example.com" }));
    render(<UserAdminClient initialUsers={users} roles={roles} />);
    await userEvent.type(screen.getByLabelText("新使用者 Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("初始密碼"), "password");
    await userEvent.click(screen.getByRole("button", { name: "新增使用者" }));

    expect(await screen.findByText("已新增使用者")).toBeInTheDocument();
  });
});
