import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserAdminClient } from "@/components/admin/user-admin-client";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockRoles = [
  { id: "role1", key: "ADMIN", name: "Administrator" },
  { id: "role2", key: "EDITOR", name: "Editor" },
];

const mockUsers = [
  {
    id: "user1",
    email: "user1@example.com",
    name: "User One",
    roleId: "role2",
    roleKey: "EDITOR",
    roleName: "Editor",
    deletedAt: null,
  },
];

describe("UserAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("renders initial users", () => {
    render(<UserAdminClient initialUsers={mockUsers} roles={mockRoles} />);
    expect(screen.getByDisplayValue("user1@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("User One")).toBeInTheDocument();
  });

  it("creates a new user", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: "user2",
          email: "new@example.com",
          name: "New User",
          roleId: "role2",
          deletedAt: null,
        },
      }),
    });

    render(<UserAdminClient initialUsers={mockUsers} roles={mockRoles} />);

    // Fill creation form
    await userEvent.type(screen.getByPlaceholderText("email"), "new@example.com");
    await userEvent.type(screen.getByPlaceholderText("名稱（可空）"), "New User");
    await userEvent.type(screen.getByPlaceholderText("密碼（至少 6 字）"), "password123");

    // Click create
    await userEvent.click(screen.getByRole("button", { name: "新增使用者" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/users", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("new@example.com"),
    }));

    await waitFor(() => {
      expect(screen.getByText("已新增")).toBeInTheDocument();
    });
    // Should verify list updated (but local state update might be tricky to test without looking for element)
    // Actually we can look for the new element if our mock return data was used to update state
    // But since `create` calls `setRows` with data from response, we need to make sure response matches component expectation
    // Our mock response data misses some fields (roleKey etc) but the component mainly renders inputs.
  });

  it("validates creation inputs", async () => {
    render(<UserAdminClient initialUsers={mockUsers} roles={mockRoles} />);

    // Invalid email
    const emailInput = screen.getByPlaceholderText("email");
    await userEvent.type(emailInput, "invalid-email");
    
    // Password too short
    const passInput = screen.getByPlaceholderText("密碼（至少 6 字）");
    await userEvent.type(passInput, "123");

    const createBtn = screen.getByRole("button", { name: "新增使用者" });
    // Button is disabled if conditions met?
    // <Button disabled={saving || !newEmail.trim() || !newRoleId || newPassword.length < 6}>
    // "invalid-email" length > 0, so button enabled by length check? No validation on email format in render, only in create()
    
    // Check password length validation (disabled state)
    expect(createBtn).toBeDisabled();

    await userEvent.type(passInput, "456"); // now 6 chars
    expect(createBtn).toBeEnabled();

    // Try submit with invalid email
    await userEvent.click(createBtn);
    await waitFor(() => {
        expect(screen.getByText("Email 格式不正確")).toBeInTheDocument();
    });
  });

  it("updates a user", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...mockUsers[0], name: "Updated Name" },
      }),
    });

    render(<UserAdminClient initialUsers={mockUsers} roles={mockRoles} />);

    const rows = screen.getAllByRole("row");
    // Row 0 is header, Row 1 is the user
    // But we are using `tbody`? Testing Library `getAllByRole('row')` includes thead rows.
    // Let's find the input with value "User One"
    
    const nameInput = screen.getByDisplayValue("User One");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Name");

    // Click save in that row
    // Need to find the save button in the SAME row
    // closest('tr') is DOM API.
    // Use `within`
    const row = nameInput.closest("tr");
    expect(row).not.toBeNull();
    
    // If getting by closest is hard in JSDOM/TestingLib without ref, we can iterate rows
    const saveBtn = within(row as HTMLElement).getByRole("button", { name: "儲存" });
    await userEvent.click(saveBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/users/user1", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("Updated Name"),
    }));

     await waitFor(() => {
      expect(screen.getByText("已更新")).toBeInTheDocument();
    });
  });

  it("deletes a user", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<UserAdminClient initialUsers={mockUsers} roles={mockRoles} />);

    const deleteBtn = screen.getByRole("button", { name: "刪除" });
    await userEvent.click(deleteBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/users/user1", expect.objectContaining({
        method: "DELETE"
    }));

    await waitFor(() => {
        expect(screen.getByText("已刪除")).toBeInTheDocument();
    });
    
    // Row should disappear (filtered out by activeRows)
    // The input with "user1@example.com" should be gone?
    // Wait for it to be removed?
    await waitFor(() => {
        expect(screen.queryByDisplayValue("user1@example.com")).not.toBeInTheDocument();
    });
  });
});
