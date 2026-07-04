import { describe, it, expect } from "vitest";
import {
  isRoleActive,
  roleHasPermission,
  roleHasAnyPermission,
} from "@/modules/security-admin/domain/rules";

describe("security-admin domain rules", () => {
  const active = { deletedAt: null, permissionKeys: ["posts:read", "posts:write"] };
  const deleted = { deletedAt: new Date(), permissionKeys: ["posts:read", "posts:write"] };

  describe("isRoleActive", () => {
    it("true for a non-deleted role", () => expect(isRoleActive(active)).toBe(true));
    it("false for a soft-deleted role", () => expect(isRoleActive(deleted)).toBe(false));
    it("false for null", () => expect(isRoleActive(null)).toBe(false));
  });

  describe("roleHasPermission", () => {
    it("true when active role holds the permission", () =>
      expect(roleHasPermission(active, "posts:write")).toBe(true));
    it("false when active role lacks the permission", () =>
      expect(roleHasPermission(active, "roles:manage")).toBe(false));
    it("false when the role is soft-deleted even if it holds the permission", () =>
      expect(roleHasPermission(deleted, "posts:write")).toBe(false));
    it("false for null role", () => expect(roleHasPermission(null, "posts:write")).toBe(false));
  });

  describe("roleHasAnyPermission", () => {
    it("true when active role holds at least one", () =>
      expect(roleHasAnyPermission(active, ["x", "posts:read"])).toBe(true));
    it("false when active role holds none", () =>
      expect(roleHasAnyPermission(active, ["x", "y"])).toBe(false));
    it("false when the role is soft-deleted", () =>
      expect(roleHasAnyPermission(deleted, ["posts:read"])).toBe(false));
    it("false for null role", () => expect(roleHasAnyPermission(null, ["posts:read"])).toBe(false));
  });
});
