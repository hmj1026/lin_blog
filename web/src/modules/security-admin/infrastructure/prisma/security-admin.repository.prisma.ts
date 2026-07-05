import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SecurityAdminRepository } from "../../application/ports";

const PERMISSION_VERSION_ID = "global";

/** 於交易中遞增全域權限版本號，供 JWT 快取失效比對使用 */
const bumpVersion = (tx: Prisma.TransactionClient) =>
  tx.permissionVersion.upsert({
    where: { id: PERMISSION_VERSION_ID },
    create: { id: PERMISSION_VERSION_ID, value: 1 },
    update: { value: { increment: 1 } },
  });

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

  async listRolesWithPermissions() {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null },
      include: { perms: true },
      orderBy: { name: "asc" },
    });
    return roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      permissionKeys: role.perms.map((p) => p.permissionKey),
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
    };
  },

  async updateRole(params) {
    return prisma.$transaction(async (tx) => {
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
      };
    });
  },

  async softDeleteRole(id) {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
      await bumpVersion(tx);
      return { id: role.id };
    });
  },

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
    return prisma.$transaction(async (tx) => {
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
    });
  },

  async softDeleteUser(id) {
    return prisma.$transaction(async (tx) => {
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
    });
  },

  countActiveUsers: () => prisma.user.count({ where: { deletedAt: null } }),

  async getPermissionsVersion() {
    const row = await prisma.permissionVersion.findUnique({ where: { id: PERMISSION_VERSION_ID }, select: { value: true } });
    return row?.value ?? 0;
  },

  async getUserAuthSnapshot(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletedAt: true,
        roleId: true,
        role: { select: { key: true, name: true, deletedAt: true, perms: { select: { permissionKey: true } } } },
      },
    });
    if (!user || user.deletedAt || !user.role || user.role.deletedAt) return null;
    return {
      roleId: user.roleId,
      roleKey: user.role.key,
      roleName: user.role.name,
      permissionKeys: user.role.perms.map((p) => p.permissionKey),
    };
  },
};
