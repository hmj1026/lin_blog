import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSecurityAdminUseCases } from "@/modules/security-admin/application/use-cases";

describe("security-admin use cases", () => {
  const repo = {
    hasRolePermission: vi.fn(),
    hasRoleAnyPermission: vi.fn(),
    listRolePermissionKeys: vi.fn(),
    listRolesWithPermissions: vi.fn(),
    listPermissions: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    softDeleteRole: vi.fn(),
    listActiveRoles: vi.fn(),
    listUsersWithRoles: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    softDeleteUser: vi.fn(),
    countActiveUsers: vi.fn(),
  };

  const useCases = createSecurityAdminUseCases({ repo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("role permission checks", () => {
    it("roleHasPermission() delegates to repo", async () => {
      repo.hasRolePermission.mockResolvedValue(true);
      const result = await useCases.roleHasPermission("role-1", "posts:write");
      expect(repo.hasRolePermission).toHaveBeenCalledWith({
        roleId: "role-1",
        permissionKey: "posts:write",
      });
      expect(result).toBe(true);
    });

    it("roleHasAnyPermission() delegates to repo", async () => {
      repo.hasRoleAnyPermission.mockResolvedValue(true);
      const result = await useCases.roleHasAnyPermission("role-1", ["posts:read", "posts:write"]);
      expect(repo.hasRoleAnyPermission).toHaveBeenCalledWith({
        roleId: "role-1",
        permissionKeys: ["posts:read", "posts:write"],
      });
      expect(result).toBe(true);
    });

    it("listRolePermissions() delegates to repo", async () => {
      repo.listRolePermissionKeys.mockResolvedValue(["posts:read", "posts:write"]);
      const result = await useCases.listRolePermissions("role-1");
      expect(repo.listRolePermissionKeys).toHaveBeenCalledWith("role-1");
      expect(result).toEqual(["posts:read", "posts:write"]);
    });
  });

  describe("role management", () => {
    it("listRolesAndPermissions() returns roles and permissions", async () => {
      repo.listRolesWithPermissions.mockResolvedValue([{ id: "r1", key: "ADMIN", name: "管理員" }]);
      repo.listPermissions.mockResolvedValue([{ id: "p1", key: "posts:read" }]);

      const result = await useCases.listRolesAndPermissions();
      expect(result.roles).toHaveLength(1);
      expect(result.permissions).toHaveLength(1);
    });

    it("createRole() validates and creates role", async () => {
      repo.createRole.mockResolvedValue({ id: "new-role" });
      const result = await useCases.createRole({
        key: "EDITOR",
        name: "編輯者",
        permissionKeys: ["posts:read", "posts:write"],
      });
      expect(repo.createRole).toHaveBeenCalledWith({
        key: "EDITOR",
        name: "編輯者",
        permissionKeys: ["posts:read", "posts:write"],
      });
      expect(result.id).toBe("new-role");
    });

    it("updateRole() validates and updates role", async () => {
      repo.updateRole.mockResolvedValue({ id: "role-1" });
      await useCases.updateRole("role-1", {
        key: "EDITOR",
        name: "編輯者 Updated",
        permissionKeys: ["posts:read"],
      });
      expect(repo.updateRole).toHaveBeenCalledWith({
        id: "role-1",
        key: "EDITOR",
        name: "編輯者 Updated",
        permissionKeys: ["posts:read"],
      });
    });

    it("softDeleteRole() delegates to repo", async () => {
      repo.softDeleteRole.mockResolvedValue(undefined);
      await useCases.softDeleteRole("role-1");
      expect(repo.softDeleteRole).toHaveBeenCalledWith("role-1");
    });

    it("listActiveRoles() delegates to repo", async () => {
      repo.listActiveRoles.mockResolvedValue([{ id: "r1" }]);
      const result = await useCases.listActiveRoles();
      expect(result).toHaveLength(1);
    });
  });

  describe("user management", () => {
    it("listUsers() delegates to repo with default params", async () => {
      repo.listUsersWithRoles.mockResolvedValue([]);
      await useCases.listUsers();
      expect(repo.listUsersWithRoles).toHaveBeenCalledWith({ includeDeleted: false });
    });

    it("listUsers() with includeDeleted=true", async () => {
      repo.listUsersWithRoles.mockResolvedValue([]);
      await useCases.listUsers({ includeDeleted: true });
      expect(repo.listUsersWithRoles).toHaveBeenCalledWith({ includeDeleted: true });
    });

    it("createUser() hashes password and creates user", async () => {
      repo.createUser.mockResolvedValue({ id: "new-user" });
      const result = await useCases.createUser({
        email: "test@example.com",
        password: "securePassword123",
        name: "Test User",
        roleId: "clyxxxxxxxxxxxxxxxxxxxxxx1",
      });
      expect(repo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          name: "Test User",
          roleId: "clyxxxxxxxxxxxxxxxxxxxxxx1",
          passwordHash: expect.any(String),
        })
      );
      // Verify password is hashed (not plain text)
      const call = repo.createUser.mock.calls[0][0];
      expect(call.passwordHash).not.toBe("securePassword123");
      expect(call.passwordHash.startsWith("$2")).toBe(true); // bcrypt hash
      expect(result.id).toBe("new-user");
    });

    it("updateUser() updates without password when not provided", async () => {
      repo.updateUser.mockResolvedValue({ id: "user-1" });
      await useCases.updateUser("user-1", {
        email: "updated@example.com",
        name: "Updated Name",
        roleId: "clyxxxxxxxxxxxxxxxxxxxxxx2",
      });
      expect(repo.updateUser).toHaveBeenCalledWith({
        id: "user-1",
        email: "updated@example.com",
        name: "Updated Name",
        roleId: "clyxxxxxxxxxxxxxxxxxxxxxx2",
        passwordHash: undefined,
      });
    });

    it("updateUser() hashes password when provided", async () => {
      repo.updateUser.mockResolvedValue({ id: "user-1" });
      await useCases.updateUser("user-1", {
        email: "updated@example.com",
        name: "Updated",
        roleId: "clyxxxxxxxxxxxxxxxxxxxxxx1",
        password: "newPassword123",
      });
      const call = repo.updateUser.mock.calls[0][0];
      expect(call.passwordHash).toBeDefined();
      expect(call.passwordHash.startsWith("$2")).toBe(true);
    });

    it("softDeleteUser() delegates to repo", async () => {
      repo.softDeleteUser.mockResolvedValue(undefined);
      await useCases.softDeleteUser("user-1");
      expect(repo.softDeleteUser).toHaveBeenCalledWith("user-1");
    });

    it("countActiveUsers() delegates to repo", async () => {
      repo.countActiveUsers.mockResolvedValue(5);
      const result = await useCases.countActiveUsers();
      expect(result).toBe(5);
    });
  });

  describe("validation errors", () => {
    it("createRole() throws on invalid payload", async () => {
      // createRole is sync function that throws synchronously via Zod
      expect(() => useCases.createRole({})).toThrow();
    });

    it("createUser() throws on invalid email", async () => {
      await expect(
        useCases.createUser({
          email: "not-an-email",
          password: "password123",
          name: "Test",
          roleId: "clyxxxxxxxxxxxxxxxxxxxxxx1",
        })
      ).rejects.toThrow();
    });

    it("createUser() throws on short password", async () => {
      await expect(
        useCases.createUser({
          email: "test@example.com",
          password: "short",
          name: "Test",
          roleId: "role-1",
        })
      ).rejects.toThrow();
    });
  });
});
