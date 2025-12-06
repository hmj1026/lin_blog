import { describe, it, expect, vi, beforeEach } from "vitest";
import { roleHasPermission, roleHasAnyPermission, listRolePermissions } from "@/lib/rbac";
import { securityAdminUseCases } from "@/modules/security-admin";

vi.mock("@/modules/security-admin", () => ({
  securityAdminUseCases: {
    roleHasPermission: vi.fn(),
    roleHasAnyPermission: vi.fn(),
    listRolePermissions: vi.fn(),
  },
}));

describe("RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("roleHasPermission", () => {
    it("回傳 true 當角色具有指定權限", async () => {
      (securityAdminUseCases.roleHasPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await roleHasPermission("role-1", "posts:write");
      expect(result).toBe(true);
      expect(securityAdminUseCases.roleHasPermission).toHaveBeenCalledWith("role-1", "posts:write");
    });

    it("回傳 false 當角色不具有指定權限", async () => {
      (securityAdminUseCases.roleHasPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await roleHasPermission("role-1", "posts:write");
      expect(result).toBe(false);
    });

    it("回傳 false 當角色已被刪除", async () => {
      (securityAdminUseCases.roleHasPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await roleHasPermission("role-1", "posts:write");
      expect(result).toBe(false);
    });

    it("回傳 false 當角色不存在", async () => {
      (securityAdminUseCases.roleHasPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await roleHasPermission("non-existent", "posts:write");
      expect(result).toBe(false);
    });
  });

  describe("roleHasAnyPermission", () => {
    it("回傳 true 當角色具有任一指定權限", async () => {
      (securityAdminUseCases.roleHasAnyPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await roleHasAnyPermission("role-1", ["posts:read", "posts:write"]);
      expect(result).toBe(true);
    });

    it("回傳 false 當角色不具有任何指定權限", async () => {
      (securityAdminUseCases.roleHasAnyPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await roleHasAnyPermission("role-1", ["posts:read", "posts:write"]);
      expect(result).toBe(false);
    });

    it("回傳 false 當角色已被刪除", async () => {
      (securityAdminUseCases.roleHasAnyPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await roleHasAnyPermission("role-1", ["posts:write"]);
      expect(result).toBe(false);
    });
  });

  describe("listRolePermissions", () => {
    it("回傳角色的所有權限 key", async () => {
      (securityAdminUseCases.listRolePermissions as ReturnType<typeof vi.fn>).mockResolvedValue(["posts:read", "posts:write"]);

      const result = await listRolePermissions("role-1");
      expect(result).toEqual(["posts:read", "posts:write"]);
    });

    it("回傳空陣列當角色無權限", async () => {
      (securityAdminUseCases.listRolePermissions as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await listRolePermissions("role-1");
      expect(result).toEqual([]);
    });
  });
});
