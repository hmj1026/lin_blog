import { describe, expect, it } from "vitest";
import { siteSettingSchema } from "@/lib/validations/site-setting.schema";

describe("siteSettingSchema", () => {
  it("accepts valid payload", () => {
    expect(siteSettingSchema.parse({ showBlogLink: true })).toEqual({ showBlogLink: true });
    expect(siteSettingSchema.parse({ showBlogLink: false })).toEqual({ showBlogLink: false });
  });

  it("rejects invalid types", () => {
    // test invalid input
    expect(() => siteSettingSchema.parse({ showBlogLink: "nope" })).toThrow();
  });
});

