import { describe, expect, it } from "vitest";
import { categorySchema } from "@/lib/validations/category.schema";

describe("categorySchema", () => {
  it("驗證有效的分類資料", () => {
    const valid = {
      slug: "tech",
      name: "Technology",
      showInNav: true,
      navOrder: 1,
    };
    expect(categorySchema.safeParse(valid).success).toBe(true);
  });

  it("拒絕缺少的必填欄位", () => {
    const invalid = {
      name: "No Slug",
    };
    expect(categorySchema.safeParse(invalid).success).toBe(false);
  });

  it("驗證可選欄位", () => {
     const valid = {
      slug: "tech",
      name: "Technology",
    };
    expect(categorySchema.safeParse(valid).success).toBe(true);
  });
});
