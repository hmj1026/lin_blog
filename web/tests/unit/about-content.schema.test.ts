import { describe, it, expect } from "vitest";
import { aboutContentSchema } from "@/lib/validations/site-setting.schema";

describe("aboutContentSchema", () => {
  it("有效 payload 可通過解析", () => {
    const result = aboutContentSchema.safeParse({
      aboutTitle: "關於我",
      aboutContent: "<p>hi</p>",
      aboutAllowRawHtml: false,
      aboutShowRawHtmlToc: false,
    });

    expect(result.success).toBe(true);
  });

  it("aboutTitle / aboutContent 為 nullish 或省略時仍可通過", () => {
    const nullResult = aboutContentSchema.safeParse({
      aboutTitle: null,
      aboutContent: null,
      aboutAllowRawHtml: false,
      aboutShowRawHtmlToc: false,
    });
    expect(nullResult.success).toBe(true);

    const omittedResult = aboutContentSchema.safeParse({
      aboutAllowRawHtml: true,
      aboutShowRawHtmlToc: true,
    });
    expect(omittedResult.success).toBe(true);
  });

  it("aboutAllowRawHtml 缺少時驗證失敗", () => {
    const result = aboutContentSchema.safeParse({
      aboutTitle: "關於我",
      aboutContent: "<p>hi</p>",
      aboutShowRawHtmlToc: false,
    });

    expect(result.success).toBe(false);
  });

  it("aboutShowRawHtmlToc 缺少時驗證失敗", () => {
    const result = aboutContentSchema.safeParse({
      aboutTitle: "關於我",
      aboutContent: "<p>hi</p>",
      aboutAllowRawHtml: false,
    });

    expect(result.success).toBe(false);
  });

  it("aboutAllowRawHtml 非 boolean 時驗證失敗", () => {
    const result = aboutContentSchema.safeParse({
      aboutTitle: "關於我",
      aboutContent: "<p>hi</p>",
      aboutAllowRawHtml: "yes",
      aboutShowRawHtmlToc: false,
    });

    expect(result.success).toBe(false);
  });

  it("aboutShowRawHtmlToc 非 boolean 時驗證失敗", () => {
    const result = aboutContentSchema.safeParse({
      aboutTitle: "關於我",
      aboutContent: "<p>hi</p>",
      aboutAllowRawHtml: false,
      aboutShowRawHtmlToc: "no",
    });

    expect(result.success).toBe(false);
  });
});
