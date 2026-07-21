import { describe, it, expect } from "vitest";
import { PERMISSIONS, EDITOR_PERMISSION_KEYS } from "../../../prisma/permission-catalog";

describe("permission catalog: subscribers:view", () => {
  it("includes subscribers:view in the full permission catalog so ADMIN (which maps over every catalog entry) is granted it", () => {
    expect(PERMISSIONS.some((p) => p.key === "subscribers:view")).toBe(true);
  });

  it("does not grant subscribers:view to EDITOR by default", () => {
    expect(EDITOR_PERMISSION_KEYS).not.toContain("subscribers:view");
  });

  it("只讓 ADMIN 預設取得 audit:view", () => {
    expect(PERMISSIONS.some((permission) => permission.key === "audit:view")).toBe(true);
    expect(EDITOR_PERMISSION_KEYS).not.toContain("audit:view");
  });

  it("keeps EDITOR's existing baseline permissions untouched", () => {
    expect(EDITOR_PERMISSION_KEYS).toEqual(
      expect.arrayContaining(["admin:access", "posts:write", "uploads:write", "analytics:view"])
    );
    expect(EDITOR_PERMISSION_KEYS).toHaveLength(4);
  });
});
