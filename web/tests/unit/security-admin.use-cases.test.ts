import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSecurityAdminUseCases } from "@/modules/security-admin/application/use-cases";

describe("security-admin use cases", () => {
  const repo = {
    getRoleAccessState: vi.fn(),
    listRolePermissionKeys: vi.fn(),
    getRoleAuditState: vi.fn(),
    listRolesWithPermissions: vi.fn(),
    listPermissions: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    softDeleteRole: vi.fn(),
    countActiveUsersForRole: vi.fn(),
    listActiveRoles: vi.fn(),
    listUsersWithRoles: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    softDeleteUser: vi.fn(),
    countActiveUsers: vi.fn(),
    userHasPermission: vi.fn(),
    countActiveUsersWithPermission: vi.fn(),
    getPermissionsVersion: vi.fn(),
    getUserAuthSnapshot: vi.fn(),
  };

  const useCases = createSecurityAdminUseCases({ repo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("role permission checks", () => {
    it("roleHasPermission() applies the domain rule over repo raw data", async () => {
      repo.getRoleAccessState.mockResolvedValue({ deletedAt: null, permissionKeys: ["posts:write"] });
      const result = await useCases.roleHasPermission("role-1", "posts:write");
      expect(repo.getRoleAccessState).toHaveBeenCalledWith("role-1");
      expect(result).toBe(true);
    });

    it("roleHasPermission() returns false for a soft-deleted role", async () => {
      repo.getRoleAccessState.mockResolvedValue({ deletedAt: new Date(), permissionKeys: ["posts:write"] });
      const result = await useCases.roleHasPermission("role-1", "posts:write");
      expect(result).toBe(false);
    });

    it("roleHasAnyPermission() applies the domain rule over repo raw data", async () => {
      repo.getRoleAccessState.mockResolvedValue({ deletedAt: null, permissionKeys: ["posts:write"] });
      const result = await useCases.roleHasAnyPermission("role-1", ["posts:read", "posts:write"]);
      expect(repo.getRoleAccessState).toHaveBeenCalledWith("role-1");
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
      repo.getRoleAccessState.mockResolvedValue({ deletedAt: null, permissionKeys: ["posts:read"] });
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
        enforceAdminFloor: false,
      });
    });

    it("updateRole() preserves the last administrator permission", async () => {
      repo.getRoleAccessState.mockResolvedValue({ deletedAt: null, permissionKeys: ["admin:access"] });
      repo.countActiveUsersForRole.mockResolvedValue(1);
      repo.countActiveUsersWithPermission.mockResolvedValue(1);

      await expect(
        useCases.updateRole("role-1", {
          key: "ADMIN",
          name: "管理員",
          permissionKeys: ["posts:write"],
        })
      ).rejects.toThrow("至少需要保留一位啟用中的管理者");
      expect(repo.updateRole).not.toHaveBeenCalled();
    });

    it("createRole() rejects analytics:view_sensitive without its dependency analytics:view", async () => {
      expect(() =>
        useCases.createRole({
          key: "AUDITOR",
          name: "稽核者",
          permissionKeys: ["admin:access", "analytics:view_sensitive"],
        })
      ).toThrow("權限相依性不完整");
      expect(repo.createRole).not.toHaveBeenCalled();
    });

    it("updateRole() rejects analytics:view_sensitive without its dependency analytics:view", async () => {
      await expect(
        useCases.updateRole("role-1", {
          key: "AUDITOR",
          name: "稽核者",
          permissionKeys: ["admin:access", "analytics:view_sensitive"],
        })
      ).rejects.toThrow("權限相依性不完整");
      expect(repo.getRoleAccessState).not.toHaveBeenCalled();
      expect(repo.updateRole).not.toHaveBeenCalled();
    });

    it("createRole() accepts analytics:view_sensitive when all dependencies are present", async () => {
      repo.createRole.mockResolvedValue({ id: "auditor-role" });
      await useCases.createRole({
        key: "AUDITOR",
        name: "稽核者",
        permissionKeys: ["admin:access", "analytics:view", "analytics:view_sensitive"],
      });
      expect(repo.createRole).toHaveBeenCalledWith(
        expect.objectContaining({
          permissionKeys: ["admin:access", "analytics:view", "analytics:view_sensitive"],
        })
      );
    });

    it("softDeleteRole() delegates to repo", async () => {
      repo.countActiveUsersForRole.mockResolvedValue(0);
      repo.softDeleteRole.mockResolvedValue(undefined);
      await useCases.softDeleteRole("role-1");
      expect(repo.softDeleteRole).toHaveBeenCalledWith("role-1");
    });

    it("softDeleteRole() rejects a role still assigned to active users", async () => {
      repo.countActiveUsersForRole.mockResolvedValue(2);

      await expect(useCases.softDeleteRole("role-1")).rejects.toThrow("仍有 2 位啟用中的使用者");
      expect(repo.softDeleteRole).not.toHaveBeenCalled();
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
      repo.userHasPermission.mockResolvedValue(false);
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
        enforceAdminFloor: false,
      });
    });

    it("updateUser() hashes password when provided", async () => {
      repo.userHasPermission.mockResolvedValue(false);
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

    it("updateUser() flags enforceAdminFloor when demoting a non-last administrator", async () => {
      repo.userHasPermission.mockResolvedValue(true);
      repo.getRoleAccessState.mockResolvedValue({ deletedAt: null, permissionKeys: ["posts:write"] });
      repo.countActiveUsersWithPermission.mockResolvedValue(2);
      repo.updateUser.mockResolvedValue({ id: "admin-1" });

      await useCases.updateUser("admin-1", {
        email: "admin@example.com",
        name: "Admin",
        roleId: "clyxxxxxxxxxxxxxxxxxxxxxx2",
      });

      expect(repo.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: "admin-1", enforceAdminFloor: true })
      );
    });

    it("updateUser() prevents moving the last administrator to a non-admin role", async () => {
      repo.userHasPermission.mockResolvedValueOnce(true);
      repo.getRoleAccessState.mockResolvedValue({ deletedAt: null, permissionKeys: ["posts:write"] });
      repo.countActiveUsersWithPermission.mockResolvedValue(1);

      await expect(
        useCases.updateUser("admin-1", {
          email: "admin@example.com",
          name: "Admin",
          roleId: "clyxxxxxxxxxxxxxxxxxxxxxx2",
        })
      ).rejects.toThrow("至少需要保留一位啟用中的管理者");
      expect(repo.updateUser).not.toHaveBeenCalled();
    });

    it("softDeleteUser() delegates to repo", async () => {
      repo.userHasPermission.mockResolvedValue(false);
      repo.softDeleteUser.mockResolvedValue(undefined);
      await useCases.softDeleteUser("user-1", { actorId: "admin-2" });
      expect(repo.softDeleteUser).toHaveBeenCalledWith("user-1", { enforceAdminFloor: false });
    });

    it("softDeleteUser() rejects self-deactivation", async () => {
      await expect(useCases.softDeleteUser("user-1", { actorId: "user-1" })).rejects.toThrow(
        "無法停用目前登入的帳號"
      );
      expect(repo.softDeleteUser).not.toHaveBeenCalled();
    });

    it("softDeleteUser() flags enforceAdminFloor when disabling a non-last administrator", async () => {
      repo.userHasPermission.mockResolvedValue(true);
      repo.countActiveUsersWithPermission.mockResolvedValue(2);
      repo.softDeleteUser.mockResolvedValue({ id: "admin-1" });

      await useCases.softDeleteUser("admin-1", { actorId: "admin-2" });

      expect(repo.softDeleteUser).toHaveBeenCalledWith("admin-1", { enforceAdminFloor: true });
    });

    it("softDeleteUser() preserves the last active administrator", async () => {
      repo.userHasPermission.mockResolvedValue(true);
      repo.countActiveUsersWithPermission.mockResolvedValue(1);

      await expect(useCases.softDeleteUser("admin-1", { actorId: "admin-2" })).rejects.toThrow(
        "至少需要保留一位啟用中的管理者"
      );
      expect(repo.softDeleteUser).not.toHaveBeenCalled();
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
