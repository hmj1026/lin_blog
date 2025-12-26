"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = searchParams.get("from") ?? "/admin";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const res = await signIn("credentials", { redirect: false, email, password, callbackUrl: from });
    setLoading(false);
    if (res?.error) {
      setError("帳號或密碼錯誤");
      return;
    }
    router.push(from as never);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-6 rounded-[32px] border border-line bg-base-100/90 p-8 shadow-soft backdrop-blur"
    >
      <div className="space-y-3">
        <Logo />
        <div>
          <h1 className="font-display text-3xl text-primary">登入後台</h1>
          <p className="mt-1 text-sm text-base-300 dark:text-base-600">管理內容、設定與社群互動</p>
        </div>
      </div>
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-primary" htmlFor="email">
          Email
        </label>
        <input
          required
          id="email"
          name="email"
          type="email"
          placeholder="輸入您的 Email"
          className="w-full rounded-xl border border-line bg-base-50 px-4 py-3 text-sm text-primary outline-none transition placeholder:text-base-300 focus:ring focus:ring-accent/30"
        />
      </div>
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-primary" htmlFor="password">
          密碼
        </label>
        <input
          required
          id="password"
          name="password"
          type="password"
          placeholder="輸入您的密碼"
          className="w-full rounded-xl border border-line bg-base-50 px-4 py-3 text-sm text-primary outline-none transition placeholder:text-base-300 focus:ring focus:ring-accent/30"
        />
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand/90 disabled:opacity-60"
      >
        {loading ? "登入中..." : "登入"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-base-75">
      <div className="pointer-events-none absolute inset-0 grid-overlay opacity-30" />
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-gradient-to-br from-orange-200 via-amber-100 to-sky-200 blur-3xl dark:from-orange-500/15 dark:via-amber-500/10 dark:to-sky-500/15" />
      <div className="pointer-events-none absolute -bottom-28 left-0 h-72 w-72 rounded-full bg-gradient-to-tr from-purple-200 via-white to-amber-100 blur-3xl dark:from-purple-500/15 dark:via-slate-500/10 dark:to-amber-500/15" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-base-300 dark:text-base-600">載入中...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
