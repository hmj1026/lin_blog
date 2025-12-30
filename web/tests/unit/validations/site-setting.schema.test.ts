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

  describe("social platforms", () => {
    it("accepts valid social platform settings", () => {
      const payload = {
        showBlogLink: true,
        showFacebook: true,
        facebookUrl: "https://facebook.com/test",
        showInstagram: false,
        instagramUrl: null,
        showThreads: true,
        threadsUrl: "https://threads.net/@test",
        showLine: false,
        lineUrl: "",
      };
      const result = siteSettingSchema.parse(payload);
      expect(result.showFacebook).toBe(true);
      expect(result.facebookUrl).toBe("https://facebook.com/test");
      expect(result.showInstagram).toBe(false);
      expect(result.showThreads).toBe(true);
      expect(result.threadsUrl).toBe("https://threads.net/@test");
      expect(result.showLine).toBe(false);
      expect(result.lineUrl).toBe("");
    });

    it("accepts empty string for URL fields", () => {
      const payload = {
        showBlogLink: true,
        facebookUrl: "",
        instagramUrl: "",
        threadsUrl: "",
        lineUrl: "",
      };
      const result = siteSettingSchema.parse(payload);
      expect(result.facebookUrl).toBe("");
      expect(result.instagramUrl).toBe("");
    });

    it("accepts null for URL fields", () => {
      const payload = {
        showBlogLink: true,
        facebookUrl: null,
        instagramUrl: null,
      };
      const result = siteSettingSchema.parse(payload);
      expect(result.facebookUrl).toBeNull();
      expect(result.instagramUrl).toBeNull();
    });

    it("rejects invalid URL format", () => {
      const payload = {
        showBlogLink: true,
        facebookUrl: "not-a-valid-url",
      };
      expect(() => siteSettingSchema.parse(payload)).toThrow();
    });

    it("rejects invalid boolean for show flags", () => {
      const payload = {
        showBlogLink: true,
        showFacebook: "yes", // should be boolean
      };
      expect(() => siteSettingSchema.parse(payload)).toThrow();
    });
  });
});
