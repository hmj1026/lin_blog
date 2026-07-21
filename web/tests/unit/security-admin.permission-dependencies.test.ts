import { describe, expect, it } from "vitest";
import {
  PERMISSION_DEPENDENCIES,
  permissionDependencyViolations,
} from "@/modules/security-admin/domain/permission-dependencies";

describe("permissionDependencyViolations", () => {
  it("宣告 analytics:view_sensitive 依賴 admin:access 與 analytics:view", () => {
    expect(PERMISSION_DEPENDENCIES["analytics:view_sensitive"]).toEqual([
      "admin:access",
      "analytics:view",
    ]);
  });

  it("回報缺少的相依權限", () => {
    const violations = permissionDependencyViolations(["admin:access", "analytics:view_sensitive"]);
    expect(violations).toEqual([
      { permissionKey: "analytics:view_sensitive", requires: "analytics:view" },
    ]);
  });

  it("同時缺多個相依權限時全部回報", () => {
    expect(permissionDependencyViolations(["analytics:view_sensitive"])).toEqual([
      { permissionKey: "analytics:view_sensitive", requires: "admin:access" },
      { permissionKey: "analytics:view_sensitive", requires: "analytics:view" },
    ]);
  });

  it("相依權限齊備時無違規", () => {
    expect(
      permissionDependencyViolations(["admin:access", "analytics:view", "analytics:view_sensitive"])
    ).toEqual([]);
  });

  it("未宣告相依的權限一律視為合法", () => {
    expect(permissionDependencyViolations(["posts:write"])).toEqual([]);
    expect(permissionDependencyViolations([])).toEqual([]);
  });
});
