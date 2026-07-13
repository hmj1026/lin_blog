import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = path.resolve(__dirname, "../../..");

/** Reads a web-root-relative source file used by the E2E execution contract. */
const readWebFile = (relativePath: string) =>
  readFileSync(path.join(WEB_ROOT, relativePath), "utf8");

describe("optimized E2E execution contract", () => {
  it("ignores generated Playwright blob reports", () => {
    const gitignore = readWebFile(".gitignore");

    expect(gitignore).toContain("/blob-report");
  });

  it("captures screenshots only when a Playwright test fails", () => {
    const config = readWebFile("playwright.config.ts");

    expect(config).toContain('screenshot: "only-on-failure"');
  });

  it("waits for both discovery search inputs before checking interactivity", () => {
    const spec = readWebFile("tests/e2e/discovery-normal-post.spec.ts");

    expect(spec).toContain("await expect(searchInputs).toHaveCount(2)");
  });

  it("uses client-loaded subscriber data as the admin hydration signal", () => {
    const spec = readWebFile("tests/e2e/discovery-a11y.spec.ts");

    expect(spec).toContain("page.getByText(/共 \\d+ 位訂閱者/)");
  });

  it("contains no permanently skipped image-upload placeholder", () => {
    const spec = readWebFile("tests/e2e/admin-posts.spec.ts");

    expect(spec).not.toContain('test.skip("在編輯器中可以上傳圖片"');
    expect(spec).not.toContain("TODO: 實作圖片上傳測試");
  });
});
