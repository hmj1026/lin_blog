import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    role: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    rolePermission: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    permission: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Import after mock
import { securityAdminRepositoryPrisma } from "@/modules/security-admin/infrastructure/prisma/security-admin.repository.prisma";

describe("securityAdminRepositoryPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRole = {
    id: "role-1",
    key: "admin",
    name: "Admin",
    deletedAt: null,
    perms: [{ id: "rp-1", permissionKey: "MANAGE_POSTS" }],
  };

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    roleId: "role-1",
    role: mockRole,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("hasRolePermission", () => {
    it("returns true if role has permission", async () => {
      (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockRole);

      const result = await securityAdminRepositoryPrisma.hasRolePermission({
        roleId: "role-1",
        permissionKey: "MANAGE_POSTS",
      });

      expect(result).toBe(true);
      expect(prisma.role.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "role-1" },
        })
      );
    });

    it("returns false if role not found", async () => {
      (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await securityAdminRepositoryPrisma.hasRolePermission({
        roleId: "role-1",
        permissionKey: "MANAGE_POSTS",
      });
      expect(result).toBe(false);
    });
  });

  describe("listRolePermissionKeys", () => {
    it("returns list of permission keys", async () => {
      (prisma.rolePermission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { permissionKey: "A" },
        { permissionKey: "B" },
      ]);

      const result = await securityAdminRepositoryPrisma.listRolePermissionKeys("role-1");

      expect(result).toEqual(["A", "B"]);
    });
  });

  describe("createRole", () => {
    it("creates role with permissions", async () => {
      (prisma.role.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "role-1" });
      (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockRole);

      const result = await securityAdminRepositoryPrisma.createRole({
        key: "admin",
        name: "Admin",
        permissionKeys: ["MANAGE_POSTS"],
      });

      expect(result.id).toBe("role-1");
      expect(prisma.role.create).toHaveBeenCalled();
      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ roleId: "role-1", permissionKey: "MANAGE_POSTS" }],
        })
      );
    });
  });

  describe("updateRole", () => {
    it("updates role and permissions", async () => {
      (prisma.role.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "role-1" });
      (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockRole);

      await securityAdminRepositoryPrisma.updateRole({
        id: "role-1",
        key: "admin",
        name: "Admin Updated",
        permissionKeys: ["NEW_PERM"],
      });

      expect(prisma.role.update).toHaveBeenCalled();
      expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "role-1" } });
      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ roleId: "role-1", permissionKey: "NEW_PERM" }],
        })
      );
    });
  });

  describe("listUsersWithRoles", () => {
    it("returns users", async () => {
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockUser]);

      const result = await securityAdminRepositoryPrisma.listUsersWithRoles({});

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe(mockUser.email);
    });
  });

  describe("createUser", () => {
    it("creates user", async () => {
      (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await securityAdminRepositoryPrisma.createUser({
        email: "test@example.com",
        passwordHash: "hash",
        name: "Test User",
        roleId: "role-1",
      });

      expect(result.id).toBe("user-1");
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "test@example.com" }),
        })
      );
    });
  });
  describe("updateUser", () => {
    it("updates user fields", async () => {
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      await securityAdminRepositoryPrisma.updateUser({
        id: "user-1",
        email: "new@example.com",
        roleId: "role-2",
        name: "New Name",
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ email: "new@example.com", roleId: "role-2" }),
        })
      );
    });
  });

  describe("softDeleteUser", () => {
    it("sets deletedAt for user", async () => {
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      await securityAdminRepositoryPrisma.softDeleteUser("user-1");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });

  describe("softDeleteRole", () => {
    it("sets deletedAt for role", async () => {
      (prisma.role.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "role-1" });
      await securityAdminRepositoryPrisma.softDeleteRole("role-1");
      expect(prisma.role.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "role-1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });

  describe("listActiveRoles", () => {
    it("returns non-deleted roles", async () => {
      (prisma.role.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockRole]);
      const result = await securityAdminRepositoryPrisma.listActiveRoles();
      expect(result).toHaveLength(1);
      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } })
      );
    });
  });

  describe("listRolesWithPermissions", () => {
    it("returns roles with permissions", async () => {
      (prisma.role.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockRole]);
      const result = await securityAdminRepositoryPrisma.listRolesWithPermissions();
      expect(result).toHaveLength(1);
      expect(result[0].permissionKeys).toContain("MANAGE_POSTS");
    });
  });

  describe("listPermissions", () => {
    it("returns all permissions", async () => {
      (prisma.permission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { key: "P", name: "N", description: "D" }
      ]);
      const result = await securityAdminRepositoryPrisma.listPermissions();
      expect(result).toHaveLength(1);
    });
  });

  describe("countActiveUsers", () => {
    it("counts non-deleted users", async () => {
      (prisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);
      expect(await securityAdminRepositoryPrisma.countActiveUsers()).toBe(5);
    });
  });
});
