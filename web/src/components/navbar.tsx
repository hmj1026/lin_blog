import { NavbarClient, type NavItem } from "./navbar-client";
import { getSession } from "@/lib/auth";
import { sessionHasPermission } from "@/lib/rbac";
import { postsQueries, siteSettingsQueries } from "@/lib/server-queries";
import type { ComponentProps } from "react";

function defaultNavItems(): NavItem[] {
  return [
    { href: "/", label: "首頁" },
    { href: "/blog", label: "部落格" },
    { href: "/category/策略", label: "策略" },
    { href: "/category/設計", label: "設計" },
    { href: "/category/社群", label: "社群" },
  ];
}

export async function Navbar() {
  // 將可能失敗的資料取得與 view-model 建構都留在同一條 Promise chain，
  // 維持既有 fallback 範圍；JSX 則在錯誤處理後渲染，避免以 try/catch
  // 取代 React error boundary。
  const props = await (async (): Promise<ComponentProps<typeof NavbarClient>> => {
    const session = await getSession();
    const [settings, categories] = await Promise.all([
      siteSettingsQueries.getDefault(),
      postsQueries.listActiveCategories({ showInNav: true }),
    ]);

    const canAdmin =
      session?.user?.roleId ? sessionHasPermission(session, "admin:access") : false;

    const navItems: NavItem[] = [{ href: "/", label: "首頁" }];
    if (settings?.showBlogLink ?? true) navItems.push({ href: "/blog", label: "部落格" });
    if (settings?.showAbout) navItems.push({ href: "/about", label: "關於我" });
    navItems.push(...categories.map((category) => ({
      href: `/category/${encodeURIComponent(category.slug)}`,
      label: category.name,
    })));

    return {
      navItems,
      adminUser:
        canAdmin && session?.user?.email
          ? { email: session.user.email, roleName: session.user.roleName ?? session.user.roleKey ?? "" }
          : null,
      siteInfo: {
        siteName: settings?.siteName ?? undefined,
        tagline: settings?.siteTagline ?? undefined,
      },
    };
  })().catch(() => ({ navItems: defaultNavItems(), adminUser: null }));

  return <NavbarClient {...props} />;
}
