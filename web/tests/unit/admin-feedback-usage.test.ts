import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

type UsageCounts = {
  alert: number;
  confirm: number;
  consoleError: number;
};

const sourceRoot = join(process.cwd(), "src/components/admin");

const allowedUsage: Record<string, UsageCounts> = {
  "src/components/admin/about-editor-form.tsx": { alert: 0, confirm: 1, consoleError: 0 },
  "src/components/admin/post-form.tsx": { alert: 0, confirm: 1, consoleError: 0 },
  "src/components/admin/post-form/cover-uploader.tsx": { alert: 0, confirm: 1, consoleError: 0 },
};

/** 遞迴列出後台元件中的 TypeScript 原始檔。 */
function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** 計算原生對話框與直接 console error 的使用次數。 */
function countUsage(source: string): UsageCounts {
  return {
    alert: source.match(/(?:window\.)?alert\s*\(/g)?.length ?? 0,
    confirm: source.match(/(?:window\.)?confirm\s*\(/g)?.length ?? 0,
    consoleError: source.match(/console\.error\s*\(/g)?.length ?? 0,
  };
}

describe("admin feedback migration inventory", () => {
  it("rejects native dialogs or console-only errors outside the recorded allowlist", () => {
    const actualUsage = Object.fromEntries(
      listSourceFiles(sourceRoot)
        .map((path) => [relative(process.cwd(), path), countUsage(readFileSync(path, "utf8"))] as const)
        .filter(([, counts]) => counts.alert + counts.confirm + counts.consoleError > 0)
    );

    expect(actualUsage).toEqual(allowedUsage);
  });
});
