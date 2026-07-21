import { describe, expect, it } from "vitest";

import { buildAdminNavigation } from "@/lib/admin-navigation";

describe("buildAdminNavigation", () => {
  it("groups editor destinations and includes media plus import/export", () => {
    const groups = buildAdminNavigation({
      permissions: ["admin:access", "posts:write", "categories:manage", "tags:manage", "uploads:write"],
      showAbout: false,
    });
    const items = groups.flatMap((group) => group.items);

    expect(groups.map((group) => group.label)).toEqual(["總覽", "內容管理", "內容資源"]);
    expect(items.map((item) => item.href)).toEqual(
      expect.arrayContaining(["/admin/posts", "/admin/media", "/admin/import-export"])
    );
    expect(items.map((item) => item.href)).not.toContain("/admin/users");
  });

  it("keeps an analytics-only session inside its permission boundary", () => {
    const groups = buildAdminNavigation({
      permissions: ["admin:access", "analytics:view"],
      showAbout: false,
    });

    expect(groups.flatMap((group) => group.items).map((item) => item.href)).toEqual([
      "/admin",
      "/admin/analytics/posts",
    ]);
  });

  it("keeps About management visible and reports its separate frontend state", () => {
    const groups = buildAdminNavigation({
      permissions: ["admin:access", "settings:manage"],
      showAbout: false,
    });
    const about = groups.flatMap((group) => group.items).find((item) => item.href === "/admin/about");

    expect(about).toEqual({
      href: "/admin/about",
      label: "關於我",
      statusLabel: "前台未啟用",
    });
  });

  it("只在具 audit:view 時顯示活動紀錄入口", () => {
    const withoutAudit = buildAdminNavigation({ permissions: ["admin:access", "users:manage"], showAbout: false });
    const withAudit = buildAdminNavigation({ permissions: ["admin:access", "audit:view"], showAbout: false });
    expect(withoutAudit.flatMap((group) => group.items).map((item) => item.href)).not.toContain("/admin/audit");
    expect(withAudit.flatMap((group) => group.items).map((item) => item.href)).toContain("/admin/audit");
  });
});
