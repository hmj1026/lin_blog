"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "儀表板" },
  { href: "/admin/posts", label: "文章列表" },
  { href: "/admin/analytics/posts", label: "文章統計" },
  { href: "/admin/categories", label: "分類管理" },
  { href: "/admin/tags", label: "標籤管理" },
  { href: "/admin/users", label: "使用者管理" },
  { href: "/admin/roles", label: "角色權限" },
  { href: "/admin/settings", label: "站點設定" },
  { href: "/logout?callbackUrl=/login", label: "登出" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }
  return (
    <aside className="min-h-screen w-64 border-r border-line bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-primary">Admin</div>
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-primary hover:border-primary/40"
        >
          前台
        </Link>
      </div>
      <nav className="mt-6 space-y-2 text-sm font-semibold text-base-300">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href as never}
              className={`block rounded-xl px-3 py-2 transition ${
                active ? "bg-primary text-white shadow-card" : "hover:bg-base-100 text-primary"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
