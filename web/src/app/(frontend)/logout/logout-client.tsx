"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/logo";

export function LogoutClient({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut({ callbackUrl });
  };

  return (
    <div className="w-full max-w-md space-y-6 rounded-[32px] border border-line bg-base-100/90 p-8 shadow-soft backdrop-blur">
      <div className="space-y-4">
        <Logo />
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-primary">確認登出</h1>
          <p className="text-sm text-base-300 dark:text-base-600">
            你即將登出管理帳號。登出後需要重新登入才能存取後台功能。
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-base-50/80 px-4 py-3 text-xs text-base-300 dark:text-base-600">
        登出後會返回上一個頁面或指定的導向頁。
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-full border border-line px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-base-50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loading}
          className="flex-1 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand/90 disabled:opacity-60"
        >
          {loading ? "登出中..." : "登出"}
        </button>
      </div>
    </div>
  );
}
