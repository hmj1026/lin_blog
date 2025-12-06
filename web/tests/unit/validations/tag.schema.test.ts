import { describe, expect, it } from "vitest";
import { tagSchema } from "@/lib/validations/tag.schema";

describe("tagSchema", () => {
  it("驗證有效的標籤資料", () => {
    const valid = {
      slug: "js",
      name: "JavaScript",
    };
    expect(tagSchema.safeParse(valid).success).toBe(true);
  });

  it("拒絕空的 slug", () => {
    const invalid = {
      slug: "",
      name: "JavaScript",
    };
    expect(tagSchema.safeParse(invalid).success).toBe(false);
  });
});
