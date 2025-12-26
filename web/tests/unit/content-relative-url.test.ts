import { describe, expect, it, vi } from "vitest";

// Mock 空的 NEXT_PUBLIC_UPLOAD_BASE_URL，模擬 local storage 場景
vi.mock("@/env.public", () => ({
  publicEnv: { NEXT_PUBLIC_UPLOAD_BASE_URL: undefined },
}));

import { resolveUploadUrl, sanitizeAndPrepareHtml } from "@/lib/utils/content";

describe("resolveUploadUrl with empty base URL (local storage)", () => {
  it("returns relative path when base URL is not set", () => {
    expect(resolveUploadUrl("uploads/a.png")).toBe("/uploads/a.png");
    expect(resolveUploadUrl("/uploads/a.png")).toBe("/uploads/a.png");
  });

  it("normalizes path to start with slash", () => {
    expect(resolveUploadUrl("api/files/abc123")).toBe("/api/files/abc123");
  });

  it("keeps absolute URLs unchanged", () => {
    expect(resolveUploadUrl("https://example.com/image.png")).toBe("https://example.com/image.png");
    expect(resolveUploadUrl("http://example.com/image.png")).toBe("http://example.com/image.png");
    expect(resolveUploadUrl("//cdn.example.com/image.png")).toBe("//cdn.example.com/image.png");
  });

  it("handles data URLs unchanged", () => {
    expect(resolveUploadUrl("data:image/png;base64,xxx")).toBe("data:image/png;base64,xxx");
    expect(resolveUploadUrl("blob:http://localhost/abc")).toBe("blob:http://localhost/abc");
  });

  it("returns empty/falsy values unchanged", () => {
    expect(resolveUploadUrl("")).toBe("");
  });
});

describe("sanitizeAndPrepareHtml with empty base URL", () => {
  it("rewrites img src to relative path", () => {
    const html = `<p>text</p><img src="uploads/image.jpg" alt="test" />`;
    const out = sanitizeAndPrepareHtml(html);
    expect(out).toContain('src="/uploads/image.jpg"');
    expect(out).not.toContain("http://localhost");
    expect(out).not.toContain("https://");
  });

  it("preserves absolute URLs in img src", () => {
    const html = `<img src="https://cdn.example.com/image.png" alt="external" />`;
    const out = sanitizeAndPrepareHtml(html);
    expect(out).toContain('src="https://cdn.example.com/image.png"');
  });
});
