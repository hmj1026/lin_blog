import { NavbarClient, type NavItem } from "./navbar-client";
import { getSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";

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
  try {
    const session = await getSession();
    const canAdmin =
      session?.user?.roleId ? await roleHasPermission(session.user.roleId, "admin:access") : false;

    const [settings, categories] = await Promise.all([
      siteSettingsUseCases.getDefault(),
      postsUseCases.listActiveCategories({ showInNav: true }),
    ]);

    const items: NavItem[] = [{ href: "/", label: "首頁" }];
    if (settings?.showBlogLink ?? true) items.push({ href: "/blog", label: "部落格" });
    items.push(...categories.map((c) => ({ href: `/category/${encodeURIComponent(c.slug)}`, label: c.name })));
    return (
      <NavbarClient
        navItems={items}
        adminUser={
          canAdmin && session?.user?.email
            ? { email: session.user.email, roleName: session.user.roleName ?? session.user.roleKey ?? "" }
            : null
        }
        siteInfo={{
          siteName: settings?.siteName ?? undefined,
          tagline: settings?.siteTagline ?? undefined,
        }}
      />
    );
  } catch {
    return <NavbarClient navItems={defaultNavItems()} adminUser={null} />;
  }
}

