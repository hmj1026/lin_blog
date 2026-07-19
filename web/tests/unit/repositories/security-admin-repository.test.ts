import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => {
  const mockPrisma: any = {
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
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    permissionVersion: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  };
  mockPrisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockPrisma));
  return { prisma: mockPrisma };
});

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
    _count: { users: 3 },
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

  describe("getRoleAccessState", () => {
    it("returns raw deletedAt and permissionKeys without validity judgment", async () => {
      (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedAt: null,
        perms: [{ permissionKey: "MANAGE_POSTS" }],
      });
      const result = await securityAdminRepositoryPrisma.getRoleAccessState("role-1");
      expect(result).toEqual({ deletedAt: null, permissionKeys: ["MANAGE_POSTS"] });
    });

    it("returns raw state even for a soft-deleted role (no judgment in repo)", async () => {
      const when = new Date();
      (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedAt: when,
        perms: [{ permissionKey: "MANAGE_POSTS" }],
      });
      const result = await securityAdminRepositoryPrisma.getRoleAccessState("role-1");
      expect(result).toEqual({ deletedAt: when, permissionKeys: ["MANAGE_POSTS"] });
    });

    it("returns null if role not found", async () => {
      (prisma.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      expect(await securityAdminRepositoryPrisma.getRoleAccessState("role-1")).toBeNull();
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
      expect(prisma.permissionVersion.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { value: { increment: 1 } } })
      );
    });
  });

  describe("listUsersWithRoles", () => {
    it("returns users", async () => {
      (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockUser]);

      const result = await securityAdminRepositoryPrisma.listUsersWithRoles({ includeDeleted: false });

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
      expect(prisma.permissionVersion.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { value: { increment: 1 } } })
      );
    });

    it("enforceAdminFloor rolls back when no administrator remains after the update", async () => {
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (prisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      await expect(
        securityAdminRepositoryPrisma.updateUser({
          id: "user-1",
          email: "new@example.com",
          roleId: "role-2",
          name: "New Name",
          enforceAdminFloor: true,
        })
      ).rejects.toThrow("至少需要保留一位啟用中的管理者");
    });

    it("enforceAdminFloor commits when at least one administrator remains", async () => {
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (prisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      const result = await securityAdminRepositoryPrisma.updateUser({
        id: "user-1",
        email: "new@example.com",
        roleId: "role-2",
        name: "New Name",
        enforceAdminFloor: true,
      });
      expect(result.id).toBe("user-1");
    });

    it("enforceAdminFloor translates a Serializable write conflict (P2034) into a retryable conflict", async () => {
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "5.22.0" })
      );
      await expect(
        securityAdminRepositoryPrisma.updateUser({
          id: "user-1",
          email: "new@example.com",
          roleId: "role-2",
          name: "New Name",
          enforceAdminFloor: true,
        })
      ).rejects.toThrow("操作發生並行衝突，請重試");
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
      expect(prisma.permissionVersion.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { value: { increment: 1 } } })
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
      expect(prisma.permissionVersion.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { value: { increment: 1 } } })
      );
    });
  });

  describe("getPermissionsVersion", () => {
    it("returns stored version value", async () => {
      (prisma.permissionVersion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ value: 3 });
      expect(await securityAdminRepositoryPrisma.getPermissionsVersion()).toBe(3);
    });

    it("returns 0 when row not found", async () => {
      (prisma.permissionVersion.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      expect(await securityAdminRepositoryPrisma.getPermissionsVersion()).toBe(0);
    });
  });

  describe("getUserAuthSnapshot", () => {
    it("returns null when user/role deleted or missing", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      expect(await securityAdminRepositoryPrisma.getUserAuthSnapshot("user-1")).toBeNull();
    });

    it("returns snapshot when user and role active", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        email: "user@example.com",
        name: "User",
        deletedAt: null,
        roleId: "role-1",
        role: { key: "admin", name: "Admin", deletedAt: null, perms: [{ permissionKey: "MANAGE_POSTS" }] },
      });
      const result = await securityAdminRepositoryPrisma.getUserAuthSnapshot("user-1");
      expect(result).toEqual({
        email: "user@example.com",
        name: "User",
        roleId: "role-1",
        roleKey: "admin",
        roleName: "Admin",
        permissionKeys: ["MANAGE_POSTS"],
      });
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
      expect(result[0].activeUserCount).toBe(3);
      expect(prisma.role.findMany).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.objectContaining({
          _count: { select: { users: { where: { deletedAt: null } } } },
        }),
      }));
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
