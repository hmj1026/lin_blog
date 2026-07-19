import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { conflict } from "@/lib/errors";
import type { SecurityAdminRepository } from "../../application/ports";

const PERMISSION_VERSION_ID = "global";
const ADMIN_ACCESS_PERMISSION = "admin:access";
/** Prisma 交易在可序列化隔離下遇到寫入衝突時回傳的錯誤碼 */
const SERIALIZATION_FAILURE = "P2034";

/** 於交易中遞增全域權限版本號，供 JWT 快取失效比對使用 */
const bumpVersion = (tx: Prisma.TransactionClient) =>
  tx.permissionVersion.upsert({
    where: { id: PERMISSION_VERSION_ID },
    create: { id: PERMISSION_VERSION_ID, value: 1 },
    update: { value: { increment: 1 } },
  });

/** 計算交易當下具備 admin:access 的啟用中使用者數（角色未刪除、使用者未刪除） */
const countActiveAdmins = (tx: Prisma.TransactionClient) =>
  tx.user.count({
    where: {
      deletedAt: null,
      role: { deletedAt: null, perms: { some: { permissionKey: ADMIN_ACCESS_PERMISSION } } },
    },
  });

/**
 * 於可序列化交易中執行變更，並在提交前確保系統仍保留至少一位管理者。
 * 可序列化隔離讓兩個並行的降權/停用請求無法同時通過，關閉「移除最後管理者」的競態；
 * 落敗的一方會拋出 P2034，於此轉譯為衝突錯誤，交由呼叫端提示重試。
 */
async function mutateWithAdminFloor<T>(body: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const result = await body(tx);
        if ((await countActiveAdmins(tx)) < 1) {
          throw conflict("至少需要保留一位啟用中的管理者");
        }
        return result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === SERIALIZATION_FAILURE) {
      throw conflict("操作發生並行衝突，請重試");
    }
    throw error;
  }
}

export const securityAdminRepositoryPrisma: SecurityAdminRepository = {
  async getRoleAccessState(roleId) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { deletedAt: true, perms: { select: { permissionKey: true } } },
    });
    if (!role) return null;
    return { deletedAt: role.deletedAt, permissionKeys: role.perms.map((p) => p.permissionKey) };
  },

  async listRolePermissionKeys(roleId) {
    const perms = await prisma.rolePermission.findMany({
      where: { roleId, role: { deletedAt: null } },
      select: { permissionKey: true },
    });
    return perms.map((p) => p.permissionKey);
  },

  async getRoleAuditState(roleId) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { key: true, name: true, perms: { select: { permissionKey: true } } },
    });
    if (!role) return null;
    return { key: role.key, name: role.name, permissionKeys: role.perms.map((p) => p.permissionKey) };
  },

  async listRolesWithPermissions() {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        perms: true,
        _count: { select: { users: { where: { deletedAt: null } } } },
      },
      orderBy: { name: "asc" },
    });
    return roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      permissionKeys: role.perms.map((p) => p.permissionKey),
      activeUserCount: role._count.users,
    }));
  },

  async listPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: { key: "asc" },
      select: { key: true, name: true, description: true },
    });
    return permissions;
  },

  async createRole(params) {
    const role = await prisma.role.create({ data: { key: params.key, name: params.name } });
    if (params.permissionKeys.length) {
      await prisma.rolePermission.createMany({
        data: params.permissionKeys.map((permissionKey) => ({ roleId: role.id, permissionKey })),
        skipDuplicates: true,
      });
    }
    const updated = await prisma.role.findUnique({ where: { id: role.id }, include: { perms: true } });
    return {
      id: updated!.id,
      key: updated!.key,
      name: updated!.name,
      permissionKeys: updated!.perms.map((p) => p.permissionKey),
      activeUserCount: 0,
    };
  },

  async updateRole(params) {
    const body = async (tx: Prisma.TransactionClient) => {
      const role = await tx.role.update({ where: { id: params.id }, data: { key: params.key, name: params.name, deletedAt: null } });

      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (params.permissionKeys.length) {
        await tx.rolePermission.createMany({
          data: params.permissionKeys.map((permissionKey) => ({ roleId: role.id, permissionKey })),
          skipDuplicates: true,
        });
      }

      const updated = await tx.role.findUnique({ where: { id: role.id }, include: { perms: true } });
      await bumpVersion(tx);
      return {
        id: updated!.id,
        key: updated!.key,
        name: updated!.name,
        permissionKeys: updated!.perms.map((p) => p.permissionKey),
        activeUserCount: await tx.user.count({ where: { roleId: role.id, deletedAt: null } }),
      };
    };
    return params.enforceAdminFloor ? mutateWithAdminFloor(body) : prisma.$transaction(body);
  },

  async softDeleteRole(id) {
    // 於可序列化交易內重新計算指派中的使用者，關閉「計數後、刪除前把使用者指派到此角色」的競態；
    // 並行指派會與此讀取序列化衝突（P2034），落敗方轉譯為衝突錯誤提示重試，
    // 避免留下 active user 指向已刪除角色導致其登入／權限解析失敗。
    try {
      return await prisma.$transaction(
        async (tx) => {
          const assignedUserCount = await tx.user.count({ where: { roleId: id, deletedAt: null } });
          if (assignedUserCount > 0) {
            throw conflict(`此角色仍有 ${assignedUserCount} 位啟用中的使用者，請先重新指派`);
          }
          const role = await tx.role.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
          await bumpVersion(tx);
          return { id: role.id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === SERIALIZATION_FAILURE) {
        throw conflict("操作發生並行衝突，請重試");
      }
      throw error;
    }
  },

  countActiveUsersForRole: (roleId) =>
    prisma.user.count({ where: { roleId, deletedAt: null } }),

  async listActiveRoles() {
    const roles = await prisma.role.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, key: true, name: true } });
    return roles;
  },

  async listUsersWithRoles(params) {
    const users = await prisma.user.findMany({
      where: params.includeDeleted ? undefined : { deletedAt: null },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      roleId: u.roleId,
      role: { id: u.role.id, key: u.role.key, name: u.role.name },
      deletedAt: u.deletedAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  },

  async createUser(params) {
    const user = await prisma.user.create({
      data: { email: params.email, password: params.passwordHash, name: params.name ?? null, roleId: params.roleId },
      include: { role: true },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: { id: user.role.id, key: user.role.key, name: user.role.name },
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },

  async updateUser(params) {
    const body = async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.update({
        where: { id: params.id },
        data: {
          email: params.email,
          name: params.name ?? null,
          roleId: params.roleId,
          password: params.passwordHash ?? undefined,
        },
        include: { role: true },
      });
      await bumpVersion(tx);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        role: { id: user.role.id, key: user.role.key, name: user.role.name },
        deletedAt: user.deletedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    };
    return params.enforceAdminFloor ? mutateWithAdminFloor(body) : prisma.$transaction(body);
  },

  async softDeleteUser(id, options) {
    const body = async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.update({ where: { id }, data: { deletedAt: new Date() }, include: { role: true } });
      await bumpVersion(tx);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        role: { id: user.role.id, key: user.role.key, name: user.role.name },
        deletedAt: user.deletedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    };
    return options?.enforceAdminFloor ? mutateWithAdminFloor(body) : prisma.$transaction(body);
  },

  countActiveUsers: () => prisma.user.count({ where: { deletedAt: null } }),

  async userHasPermission(userId, permissionKey) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        role: {
          deletedAt: null,
          perms: { some: { permissionKey } },
        },
      },
      select: { id: true },
    });
    return Boolean(user);
  },

  countActiveUsersWithPermission: (permissionKey) =>
    prisma.user.count({
      where: {
        deletedAt: null,
        role: {
          deletedAt: null,
          perms: { some: { permissionKey } },
        },
      },
    }),

  async getPermissionsVersion() {
    const row = await prisma.permissionVersion.findUnique({ where: { id: PERMISSION_VERSION_ID }, select: { value: true } });
    return row?.value ?? 0;
  },

  async getUserAuthSnapshot(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        deletedAt: true,
        roleId: true,
        role: { select: { key: true, name: true, deletedAt: true, perms: { select: { permissionKey: true } } } },
      },
    });
    if (!user || user.deletedAt || !user.role || user.role.deletedAt) return null;
    return {
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleKey: user.role.key,
      roleName: user.role.name,
      permissionKeys: user.role.perms.map((p) => p.permissionKey),
    };
  },
};
