import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const responsiveTableFiles = [
  "src/components/admin/post-list-client.tsx",
  "src/app/(admin)/admin/analytics/posts/page.tsx",
  "src/app/(admin)/admin/analytics/posts/[postId]/page.tsx",
  "src/components/admin/subscriber-list-client.tsx",
  "src/components/admin/category-admin-client.tsx",
  "src/components/admin/tag-admin-client.tsx",
  "src/components/admin/user-admin-client.tsx",
];
const requiredViewports = [375, 768, 1024];

describe("responsive admin table migration", () => {
  it.each(requiredViewports.flatMap((width) => responsiveTableFiles.map((file) => [width, file] as const)))(
    "uses the shared responsive table contract at %ipx in %s",
    (_width, file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    expect(source).toContain("AdminDataTable");
    expect(source).not.toMatch(/overflow-hidden[^\n]*>\s*\n?\s*<table/);
    }
  );
});

describe("responsive site settings form", () => {
  it.each(requiredViewports)("keeps settings controls and previews bounded at %ipx", () => {
    const source = readFileSync(join(process.cwd(), "src/components/admin/site-settings-form.tsx"), "utf8");
    expect(source).not.toContain("<table");
    expect(source).toContain("flex flex-wrap");
    expect(source).toContain("max-w-[375px]");
    expect(source).toContain("md:grid-cols-2");
  });
});
