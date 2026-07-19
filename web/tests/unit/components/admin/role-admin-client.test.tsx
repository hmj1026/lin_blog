import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleAdminClient } from "@/components/admin/role-admin-client";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockPermissions = [
  { key: "admin:access", name: "後台存取" },
  { key: "posts:write", name: "文章管理" },
  { key: "uploads:write", name: "檔案上傳" },
  { key: "analytics:view", name: "文章統計" },
  { key: "analytics:view_sensitive", name: "文章統計（IP/UA）" },
  { key: "roles:manage", name: "角色權限管理" },
];

const mockRoles = [
  { id: "role1", key: "ROLE_ONE", name: "Role One", permissionKeys: ["admin:access", "posts:write"], activeUserCount: 3 },
];

describe("RoleAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("renders roles", () => {
    render(<RoleAdminClient permissions={mockPermissions} initialRoles={mockRoles} />);
    expect(screen.getByDisplayValue("Role One")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ROLE_ONE")).toBeInTheDocument();
    
    // Check permission checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    // Role One should have perm1 checked, perm2 unchecked
    // But how to identify? By label text.
    
    // The component renders permissions for EACH role.
    // We can look within the role card.
  });

  it("依功能分組並顯示角色能力摘要與啟用使用者數", () => {
    render(<RoleAdminClient permissions={mockPermissions} initialRoles={mockRoles} />);

    expect(screen.getByText("內容管理")).toBeInTheDocument();
    expect(screen.getByText("洞察與資料")).toBeInTheDocument();
    expect(screen.getByText("系統管理")).toBeInTheDocument();
    expect(screen.getByText("3 位啟用使用者")).toBeInTheDocument();
    expect(screen.getByText(/能力摘要：後台存取、文章管理/)).toBeInTheDocument();
  });

  it("可從既有角色複製權限範本", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: "role2", key: "ROLE_ONE_COPY", name: "Role One 複本", permissionKeys: ["admin:access", "posts:write"] } }),
    });
    render(<RoleAdminClient permissions={mockPermissions} initialRoles={mockRoles} />);

    await userEvent.click(screen.getByRole("button", { name: "以 Role One 為範本新增" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/roles", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ key: "ROLE_ONE_COPY", name: "Role One 複本", permissionKeys: ["admin:access", "posts:write"] }),
    }));
    expect(await screen.findByDisplayValue("Role One 複本")).toBeInTheDocument();
  });

  it("權限缺少相依項目時顯示警告並阻擋儲存", async () => {
    render(<RoleAdminClient permissions={mockPermissions} initialRoles={mockRoles} />);
    const card = screen.getByDisplayValue("Role One").closest(".rounded-2xl") as HTMLElement;

    await userEvent.click(within(card).getByRole("checkbox", { name: /後台存取/ }));

    expect(within(card).getByRole("alert")).toHaveTextContent("文章管理需要先啟用後台存取");
    expect(within(card).getByRole("button", { name: "儲存" })).toBeDisabled();
  });

  it("creates a new role", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "role2", key: "NEW_ROLE", name: "新角色", permissionKeys: [] },
      }),
    });

    render(<RoleAdminClient permissions={mockPermissions} initialRoles={mockRoles} />);

    const createBtn = screen.getByText("新增角色");
    await userEvent.click(createBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/roles", expect.objectContaining({ method: "POST" }));

    await waitFor(() => {
      expect(screen.getAllByDisplayValue("新角色")).toHaveLength(1);
    });
  });

  it("updates role permissions and saves", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "role1", key: "ROLE_ONE", name: "Role One", permissionKeys: ["admin:access", "posts:write", "uploads:write"] },
      }),
    });

    render(<RoleAdminClient permissions={mockPermissions} initialRoles={mockRoles} />);

    // Find Role One card
    const nameInput = screen.getByDisplayValue("Role One");
    const card = nameInput.closest(".rounded-2xl"); // The parent card
    expect(card).not.toBeNull();
    
    // Toggle uploads:write (檔案上傳)
    const perm2Label = within(card as HTMLElement).getByText(/檔案上傳/i);
    // Click the label or input
    await userEvent.click(perm2Label);

    // Click Save
    const saveBtn = within(card as HTMLElement).getByText("儲存");
    await userEvent.click(saveBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/roles/role1", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("uploads:write"),
    }));
    
    await waitFor(() => {
        expect(screen.getByText("已儲存")).toBeInTheDocument();
    });
  });

  it("deletes a role", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<RoleAdminClient permissions={mockPermissions} initialRoles={mockRoles} />);

    const deleteBtn = screen.getByText("刪除");
    await userEvent.click(deleteBtn);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "確認刪除角色" })).toBeInTheDocument();
    expect(screen.getByText(/Role One/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "確認刪除" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/roles/role1", expect.objectContaining({ method: "DELETE" }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Role One")).not.toBeInTheDocument();
    });
  });
});
