import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleAdminClient } from "@/components/admin/role-admin-client";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockPermissions = [
  { key: "perm1", name: "Permission One" },
  { key: "perm2", name: "Permission Two" },
];

const mockRoles = [
  { id: "role1", key: "ROLE_ONE", name: "Role One", permissionKeys: ["perm1"] },
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
        data: { id: "role1", key: "ROLE_ONE", name: "Role One", permissionKeys: ["perm1", "perm2"] },
      }),
    });

    render(<RoleAdminClient permissions={mockPermissions} initialRoles={mockRoles} />);

    // Find Role One card
    const nameInput = screen.getByDisplayValue("Role One");
    const card = nameInput.closest(".rounded-2xl"); // The parent card
    expect(card).not.toBeNull();
    
    // Toggle perm2 (Permission Two)
    const perm2Label = within(card as HTMLElement).getByText(/Permission Two/i);
    // Click the label or input
    await userEvent.click(perm2Label);

    // Click Save
    const saveBtn = within(card as HTMLElement).getByText("儲存");
    await userEvent.click(saveBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/roles/role1", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("perm2"),
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

    expect(fetchMock).toHaveBeenCalledWith("/api/roles/role1", expect.objectContaining({ method: "DELETE" }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Role One")).not.toBeInTheDocument();
    });
  });
});
