import { describe, expect, it, vi } from "vitest";

vi.mock("@/env.public", () => ({
  publicEnv: { NEXT_PUBLIC_UPLOAD_BASE_URL: "https://cdn.example.com" },
}));

import { prepareForRender, sanitizeContentByMode } from "@/lib/content-pipeline";
import { sanitizeRawPostHtml } from "@/lib/utils/sanitize";

describe("sanitizeContentByMode", () => {
  it("uses the relaxed sanitizer in raw mode (keeps class/style/<style>)", () => {
    const html = `<div class="x" style="color:red"><style>.x{color:red}</style><p>body</p></div>`;
    const out = sanitizeContentByMode(html, true);
    expect(out).toContain('class="x"');
    expect(out).toMatch(/style="color/);
    expect(out).toContain("<style>");
  });

  it("uses the strict sanitizer in normal mode (drops div/style/class)", () => {
    const html = `<div class="x" style="color:red"><style>.x{color:red}</style><p>body</p></div>`;
    const out = sanitizeContentByMode(html, false);
    expect(out).not.toContain("<style>");
    expect(out).not.toMatch(/style=/);
    expect(out).not.toMatch(/class=/);
    expect(out).toContain("<p>body</p>");
  });

  it("removes script and event attributes in both modes", () => {
    const html = `<p onclick="alert(1)">x</p><script>alert(1)</script>`;
    for (const mode of [true, false]) {
      const out = sanitizeContentByMode(html, mode);
      expect(out).not.toMatch(/script/i);
      expect(out).not.toMatch(/onclick/i);
    }
  });
});

describe("prepareForRender", () => {
  it("returns iframe strategy in raw mode and preserves class/style/<style>", () => {
    const { html, tocItems, strategy } = prepareForRender(
      `<h2>Intro</h2><div class="x" style="color:red"><style>.x{color:red}</style><p>body</p></div>`,
      true
    );
    expect(strategy).toBe("iframe");
    expect(html).toContain('class="x"');
    expect(html).toMatch(/style="color/);
    expect(html).toContain("<style>");
    expect(html).toContain('id="toc-0"');
    expect(tocItems).toHaveLength(1);
  });

  it("returns inline strategy in normal mode with heading IDs and rewritten img src", () => {
    const { html, tocItems, strategy } = prepareForRender(
      `<h2>Intro</h2><p>t</p><img src="uploads/a.png" alt="a" />`,
      false
    );
    expect(strategy).toBe("inline");
    expect(html).toContain('id="toc-0"');
    expect(html).toContain(`src="https://cdn.example.com/uploads/a.png"`);
    expect(tocItems).toHaveLength(1);
  });

  it("strictly re-sanitizes desynced raw-sanitized content when mode=false", () => {
    // 內容曾以 raw 模式儲存（寬鬆 allowlist 放行 <style>/style=/class/div），
    // 旗標翻回 false 未重存 → 渲染端必須嚴格重消毒。
    const rawStored = sanitizeRawPostHtml(
      `<style>.x{color:red}</style><div class="x" style="color:red" onclick="alert(1)"><h2>T</h2><p>body</p></div>`
    );
    // 前置確認：raw 消毒確實保留了寬鬆內容
    expect(rawStored).toContain("<style>");
    expect(rawStored).toMatch(/style=/);

    const { html, strategy } = prepareForRender(rawStored, false);
    expect(strategy).toBe("inline");
    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).toContain("body");
  });

  it("leaves legitimate strict-mode content unaffected when mode=false", () => {
    const legit = `<h2>Title</h2><p>hello <strong>world</strong></p><a href="https://example.com" title="t">link</a>`;
    const { html, tocItems, strategy } = prepareForRender(legit, false);
    expect(strategy).toBe("inline");
    expect(html).toContain('id="toc-0"');
    expect(html).toContain("<strong>world</strong>");
    expect(html).toMatch(/<a[^>]*href="https:\/\/example\.com"/);
    expect(tocItems).toHaveLength(1);
  });

  it("handles empty content in both modes", () => {
    expect(prepareForRender("", true)).toEqual({ html: "", tocItems: [], strategy: "iframe" });
    expect(prepareForRender("", false)).toEqual({ html: "", tocItems: [], strategy: "inline" });
  });
});
