import { describe, expect, it } from "vitest";
import { userSchema } from "@/lib/validations/user.schema";
import { adminUserCreateSchema, adminUserUpdateSchema } from "@/lib/validations/admin-user.schema";

describe("userSchema", () => {
  it("驗證有效的用戶資料", () => {
    const valid = {
      email: "test@example.com",
      name: "Test User",
      roleId: "cjld2cjxh0000qzrmn831i7rn",
    };
    expect(userSchema.safeParse(valid).success).toBe(true);
  });

  it("拒絕無效的 Email", () => {
    const invalid = {
      email: "not-an-email",
    };
    expect(userSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("adminUserCreateSchema", () => {
    it("驗證有效的管理員建立資料", () => {
        const valid = {
            email: "admin@example.com",
            password: "password123",
            roleId: "cjld2cjxh0000qzrmn831i7rn",
             name: "Admin"
        };
        expect(adminUserCreateSchema.safeParse(valid).success).toBe(true);
    });

    it("拒絕太短的密碼", () => {
         const invalid = {
            email: "admin@example.com",
            password: "123", // too short
            roleId: "cjld2cjxh0000qzrmn831i7rn",
        };
        expect(adminUserCreateSchema.safeParse(invalid).success).toBe(false);
    });
});

describe("adminUserUpdateSchema", () => {
     it("驗證有效的管理員更新資料 (含密碼)", () => {
        const valid = {
            email: "admin@example.com",
             password: "new-password",
            roleId: "cjld2cjxh0000qzrmn831i7rn",
             name: "Admin Updated"
        };
        expect(adminUserUpdateSchema.safeParse(valid).success).toBe(true);
    });

    it("驗證有效的管理員更新資料 (不含密碼)", () => {
        const valid = {
            email: "admin@example.com",
            roleId: "cjld2cjxh0000qzrmn831i7rn",
             name: "Admin Updated"
        };
        expect(adminUserUpdateSchema.safeParse(valid).success).toBe(true);
    });
});
