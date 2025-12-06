import { describe, expect, it } from "vitest";
import { roleUpsertSchema } from "@/lib/validations/role.schema";

describe("roleUpsertSchema", () => {
  it("驗證有效的角色資料", () => {
    const valid = {
      key: "editor",
      name: "Editor",
      permissionKeys: ["posts:read", "posts:write"],
    };
    expect(roleUpsertSchema.safeParse(valid).success).toBe(true);
  });

  it("驗證 permissionKeys 預設值", () => {
      const valid = {
      key: "viewer",
      name: "Viewer",
      // permissionKeys missing
    };
    const result = roleUpsertSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data.permissionKeys).toEqual([]);
    }
  });

  it("拒絕空的 key", () => {
     const invalid = {
      key: "",
      name: "Editor",
    };
    expect(roleUpsertSchema.safeParse(invalid).success).toBe(false);
  });
});
