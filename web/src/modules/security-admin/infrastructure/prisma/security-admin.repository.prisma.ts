import { prisma } from "@/lib/db";
import type { SecurityAdminRepository } from "../../application/ports";

export const securityAdminRepositoryPrisma: SecurityAdminRepository = {
  async hasRolePermission(params) {
    const role = await prisma.role.findUnique({
      where: { id: params.roleId },
      select: { deletedAt: true, perms: { where: { permissionKey: params.permissionKey }, select: { id: true } } },
    });
    if (!role || role.deletedAt) return false;
    return role.perms.length > 0;
  },

  async hasRoleAnyPermission(params) {
    const role = await prisma.role.findUnique({
      where: { id: params.roleId },
      select: {
        deletedAt: true,
        perms: { where: { permissionKey: { in: params.permissionKeys } }, select: { id: true } },
      },
    });
    if (!role || role.deletedAt) return false;
    return role.perms.length > 0;
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
    const role = await prisma.role.update({ where: { id: params.id }, data: { key: params.key, name: params.name, deletedAt: null } });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
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

  async softDeleteRole(id) {
    const role = await prisma.role.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
    return { id: role.id };
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
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        email: params.email,
        name: params.name ?? null,
        roleId: params.roleId,
        password: params.passwordHash ?? undefined,
      },
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

  async softDeleteUser(id) {
    const user = await prisma.user.update({ where: { id }, data: { deletedAt: new Date() }, include: { role: true } });
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

  countActiveUsers: () => prisma.user.count({ where: { deletedAt: null } }),
};
