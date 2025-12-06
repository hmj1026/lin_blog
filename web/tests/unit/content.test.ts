import { describe, expect, it, vi } from "vitest";

vi.mock("@/env.public", () => ({
  publicEnv: { NEXT_PUBLIC_UPLOAD_BASE_URL: "https://cdn.example.com" },
}));

import { resolveUploadUrl, sanitizeAndPrepareHtml } from "@/lib/utils/content";

describe("resolveUploadUrl", () => {
  it("keeps absolute urls", () => {
    expect(resolveUploadUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(resolveUploadUrl("data:image/png;base64,xxx")).toBe("data:image/png;base64,xxx");
  });

  it("prefixes base url for relative paths", () => {
    expect(resolveUploadUrl("uploads/a.png")).toBe("https://cdn.example.com/uploads/a.png");
    expect(resolveUploadUrl("/uploads/a.png")).toBe("https://cdn.example.com/uploads/a.png");
  });
});

describe("sanitizeAndPrepareHtml", () => {
  it("removes script tags and event handlers", () => {
    const html = `<p onclick="alert(1)">x</p><script>alert(1)</script>`;
    const out = sanitizeAndPrepareHtml(html);
    expect(out).toMatch(/<p\b/i);
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it("rewrites img src", () => {
    const html = `<p>t</p><img src="uploads/a.png" alt="a" />`;
    const out = sanitizeAndPrepareHtml(html);
    expect(out).toContain(`src="https://cdn.example.com/uploads/a.png"`);
  });
});
