"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export type NavItem = { href: string; label: string };

function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href as never}
      className={`text-sm font-medium transition-colors ${
        active 
          ? "text-accent-600 dark:text-accent-400 font-semibold" 
          : "text-base-300 hover:text-accent-600 dark:text-base-500 dark:hover:text-accent-400"
      }`}
    >
      {label}
    </Link>
  );
}

function SearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}` as never);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋..."
        className="w-32 rounded-full border border-line bg-white/80 px-4 py-2 text-sm text-primary placeholder:text-base-300 focus:w-48 focus:border-primary focus:outline-none transition-all dark:bg-base-100 dark:border-base-200 dark:placeholder:text-base-500"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-base-300 hover:text-primary dark:text-base-600"
        aria-label="搜尋"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </form>
  );
}

export function NavbarClient({
  navItems,
  adminUser,
  siteInfo,
}: {
  navItems: NavItem[];
  adminUser: null | { email: string; roleName: string };
  siteInfo?: { siteName?: string; tagline?: string };
}) {
  const [open, setOpen] = useState(false);
  const adminInitial = adminUser?.email?.[0]?.toUpperCase() ?? "";
  const roleLabel = adminUser?.roleName?.trim() || "管理者";
  const navGap = adminUser ? "gap-6" : "gap-8";
  const actionGap = adminUser ? "gap-2" : "gap-3";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 shadow-card backdrop-blur dark:bg-base-50">
      <div className="section-shell flex items-center justify-between py-4">
        <Link href="/" aria-label="返回首頁">
          <Logo siteName={siteInfo?.siteName} tagline={siteInfo?.tagline} />
        </Link>
        <nav className={`hidden items-center ${navGap} lg:flex`}>
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className={`hidden items-center ${actionGap} lg:flex`}>
          {/* 搜尋欄位 */}
          <SearchInput />
          {/* 主題切換 */}
          <ThemeToggle />
          {/* TODO: 未來實作後啟用
          <Link
            href="#newsletter"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand/90"
          >
            訂閱電子報
          </Link>
          <Link
            href="#contact"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-white/60 dark:hover:bg-base-75/60"
          >
            與我合作
          </Link>
          */}
          {adminUser && (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full border border-line bg-base-50/80 px-3 py-2 shadow-card transition hover:border-primary/30 hover:bg-white/60 dark:bg-base-100/70 dark:hover:bg-base-75/60 [&::-webkit-details-marker]:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-orange-400 text-xs font-semibold text-white shadow-card">
                  {adminInitial || "A"}
                </div>
                <div className="flex flex-col leading-tight">
                  <div className="hidden max-w-[160px] truncate text-xs font-semibold text-primary 2xl:block" title={adminUser.email}>
                    {adminUser.email}
                  </div>
                  <div className="text-[11px] text-base-300 dark:text-base-600">{roleLabel}</div>
                </div>
                <svg
                  className="h-3 w-3 text-base-300 transition group-open:rotate-180 dark:text-base-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-line bg-white p-4 shadow-soft dark:bg-base-100">
                <div className="text-sm font-semibold text-primary">{adminUser.email}</div>
                <div className="text-xs text-base-300 dark:text-base-600">{roleLabel}</div>
                <div className="mt-4 grid gap-2">
                  <Link
                    href="/admin"
                    className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-primary text-center transition hover:border-primary/30 hover:bg-base-50"
                  >
                    後台
                  </Link>
                  <Link
                    href="/logout?callbackUrl=/"
                    className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-primary text-center transition hover:border-primary/30 hover:bg-base-50"
                  >
                    登出
                  </Link>
                </div>
              </div>
            </details>
          )}
        </div>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-primary lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="切換選單"
        >
          <span className="sr-only">開啟選單</span>
          <div className="flex w-6 flex-col gap-1.5">
            <span className={`h-0.5 w-full bg-primary transition ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`h-0.5 w-full bg-primary transition ${open ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-full bg-primary transition ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </div>
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white/95 backdrop-blur-md px-6 py-4 shadow-2xl lg:hidden dark:bg-neutral-900/95 dark:border-neutral-800">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
            {adminUser && (
              <div className="rounded-2xl border border-line bg-base-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-orange-400 text-sm font-semibold text-white shadow-card">
                    {adminInitial || "A"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-primary">{adminUser.email}</div>
                    <div className="text-xs text-base-300 dark:text-base-600">{roleLabel}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/admin"
                    className="rounded-full border border-line px-4 py-3 text-sm font-semibold text-primary text-center"
                  >
                    後台
                  </Link>
                  <Link
                    href="/logout?callbackUrl=/"
                    className="rounded-full border border-line px-4 py-3 text-sm font-semibold text-primary text-center"
                  >
                    登出
                  </Link>
                </div>
              </div>
            )}
            {/* TODO: 未來實作後啟用
            <Link
              href="#newsletter"
              className="rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-card text-center"
            >
              訂閱電子報
            </Link>
            <Link
              href="#contact"
              className="rounded-full border border-line px-4 py-3 text-sm font-semibold text-primary text-center"
            >
              與我合作
            </Link>
            */}
          </div>
        </div>
      )}
    </header>
  );
}
