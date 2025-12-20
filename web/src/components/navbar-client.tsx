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
        active ? "text-primary" : "text-base-300 hover:text-primary"
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
        className="w-32 rounded-full border border-line bg-white/80 px-4 py-2 text-sm text-primary placeholder:text-base-300 focus:w-48 focus:border-primary focus:outline-none transition-all"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-base-300 hover:text-primary"
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
}: {
  navItems: NavItem[];
  adminUser: null | { email: string; roleName: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 shadow-card backdrop-blur">
      <div className="section-shell flex items-center justify-between py-4">
        <Link href="/" aria-label="返回首頁">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {/* 搜尋欄位 */}
          <SearchInput />
          {/* 主題切換 */}
          <ThemeToggle />
          <Link
            href="#newsletter"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90"
          >
            訂閱電子報
          </Link>
          <Link
            href="#contact"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-white/60"
          >
            與我合作
          </Link>
          {adminUser && (
            <>
              <div className="hidden xl:flex flex-col items-end leading-tight">
                <div className="text-xs font-semibold text-primary">{adminUser.email}</div>
                <div className="text-[11px] text-base-300">{adminUser.roleName}</div>
              </div>
              <Link
                href="/admin"
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-white/60"
              >
                後台
              </Link>
              <Link
                href="/api/auth/signout?callbackUrl=/"
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-white/60"
              >
                登出
              </Link>
            </>
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
        <div className="border-t border-line bg-white/95 px-6 py-4 shadow-card lg:hidden">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
            {adminUser && (
              <div className="rounded-2xl border border-line bg-base-50 px-4 py-3">
                <div className="text-sm font-semibold text-primary">{adminUser.email}</div>
                <div className="text-xs text-base-300">{adminUser.roleName}</div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/admin"
                    className="flex-1 rounded-full border border-line px-4 py-3 text-sm font-semibold text-primary text-center"
                  >
                    後台
                  </Link>
                  <Link
                    href="/api/auth/signout?callbackUrl=/"
                    className="flex-1 rounded-full border border-line px-4 py-3 text-sm font-semibold text-primary text-center"
                  >
                    登出
                  </Link>
                </div>
              </div>
            )}
            <Link
              href="#newsletter"
              className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-card text-center"
            >
              訂閱電子報
            </Link>
            <Link
              href="#contact"
              className="rounded-full border border-line px-4 py-3 text-sm font-semibold text-primary text-center"
            >
              與我合作
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
