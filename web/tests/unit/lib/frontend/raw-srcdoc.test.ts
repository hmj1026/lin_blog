import { describe, it, expect } from "vitest";
import {
  buildRawPostSrcDoc,
  RAW_HTML_FRAME_HEIGHT_REQUEST_MESSAGE,
} from "@/lib/frontend/raw-srcdoc";

describe("buildRawPostSrcDoc", () => {
  it("handles the height request message so a late-hydrating parent can pull the height", () => {
    // 回歸鎖定：iframe 於載入時 push 的高度訊息可能早於 parent listener 附掛
    // 而丟失，srcdoc script 必須回應 parent 就緒後補發的高度請求（握手）。
    const srcDoc = buildRawPostSrcDoc("<p>content</p>");

    expect(srcDoc).toContain(JSON.stringify(RAW_HTML_FRAME_HEIGHT_REQUEST_MESSAGE));
    const script = srcDoc.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toMatch(/HEIGHT_REQUEST_MESSAGE[\s\S]*reportHeight\(\)/);
  });

  it("resets html and body margin/padding to zero with no left-right body padding", () => {
    const srcDoc = buildRawPostSrcDoc("<p>content</p>");

    expect(srcDoc).toMatch(/html,\s*body\s*\{\s*margin:\s*0;\s*padding:\s*0;\s*\}/);
    expect(srcDoc).not.toMatch(/padding:\s*1rem\s*1\.5rem/);

    const styleBlock = srcDoc.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
    const paddingDeclarations = styleBlock.match(/padding:\s*[^;]+;/g) ?? [];
    for (const declaration of paddingDeclarations) {
      expect(declaration).toMatch(/padding:\s*0;/);
    }
  });

  it("does not set a content max-width in the system CSS", () => {
    const srcDoc = buildRawPostSrcDoc("<p>content</p>");

    expect(srcDoc).not.toMatch(/body\s*\{[^}]*max-width/);

    const maxWidthMatches = srcDoc.match(/[a-z]+\s*\{[^}]*max-width[^}]*\}/g) ?? [];
    expect(maxWidthMatches).toHaveLength(1);
    expect(maxWidthMatches[0]).toMatch(/^img/);
  });

  it("keeps the img max-width reset for responsive images", () => {
    const srcDoc = buildRawPostSrcDoc("<p>content</p>");

    expect(srcDoc).toContain("img { max-width: 100%");
  });

  it("passes author inline grid/auto-fit/minmax styles through unchanged", () => {
    const authorHtml =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">grid content</div>';
    const srcDoc = buildRawPostSrcDoc(authorHtml);

    expect(srcDoc).toContain(
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">grid content</div>'
    );
  });

  it("embeds the raw html body content verbatim", () => {
    const authorHtml = "<h2>Title</h2><p>Body text</p>";
    const srcDoc = buildRawPostSrcDoc(authorHtml);

    expect(srcDoc).toContain(authorHtml);
  });
});
