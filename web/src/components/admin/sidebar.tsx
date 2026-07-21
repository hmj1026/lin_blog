"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AdminNavigationGroup } from "@/lib/admin-navigation";

function SidebarNav({
  pathname,
  onNavigate,
  navigationGroups,
  account,
}: {
  pathname: string;
  onNavigate?: () => void;
  navigationGroups: AdminNavigationGroup[];
  account: { email: string; roleName: string };
}) {
  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }
  return (
    <>
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
      <nav className="mt-6 space-y-5 text-sm font-semibold text-base-300" aria-label="後台功能">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <div className="px-3 text-xs font-semibold uppercase tracking-wide text-base-300">
              {group.label}
            </div>
            <div className="mt-2 space-y-1">
              {group.items.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href as never}
                    onClick={onNavigate}
                    className={`block rounded-xl px-3 py-2 transition ${
                      active ? "bg-primary text-white shadow-card" : "hover:bg-base-100 text-primary"
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.statusLabel ? (
                      <span className="ml-2 text-xs font-normal opacity-75">{link.statusLabel}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-6 border-t border-line pt-4">
        <div className="truncate text-sm font-semibold text-primary">{account.roleName}</div>
        <div className="truncate text-xs text-base-300">{account.email}</div>
        <Link
          href={"/logout?callbackUrl=/login" as never}
          onClick={onNavigate}
          className="mt-3 block rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-base-100"
        >
          登出
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar({
  navigationGroups,
  account,
}: {
  navigationGroups: AdminNavigationGroup[];
  account: { email: string; roleName: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // 開啟時將焦點移入抽屜、Esc 關閉、Tab 於抽屜內循環（基本焦點陷阱）；關閉後焦點還原至觸發按鈕
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    drawerRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const drawer = drawerRef.current;
        if (!drawer) return;
        const focusables = drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [open]);

  // 路由變更時自動關閉抽屜：以 render 期 reset（React 官方
  // adjusting-state-when-props-change 模式）取代 effect 內 setState
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      {/* 手機版 hamburger 觸發按鈕 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="開啟導覽選單"
        aria-expanded={open}
        aria-controls="admin-mobile-drawer"
        className="fixed left-4 top-4 z-30 rounded-lg border border-line bg-white p-2 text-primary shadow-card md:hidden"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 桌面版固定側邊欄 */}
      <aside className="hidden min-h-screen w-64 border-r border-line bg-white p-6 md:block">
        <SidebarNav pathname={pathname} navigationGroups={navigationGroups} account={account} />
      </aside>

      {/* 手機版抽屜 */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-primary/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            id="admin-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="後台導覽選單"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 w-64 max-w-[80%] overflow-y-auto border-r border-line bg-white p-6 shadow-card outline-none"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="關閉導覽選單"
              className="absolute right-4 top-4 rounded-lg p-1 text-primary hover:bg-base-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <SidebarNav
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              navigationGroups={navigationGroups}
              account={account}
            />
          </div>
        </div>
      )}
    </>
  );
}
