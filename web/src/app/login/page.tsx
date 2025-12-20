"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

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
      className="w-full max-w-md space-y-6 rounded-3xl border border-line bg-white p-8 shadow-card"
    >
      <div>
        <h1 className="font-display text-3xl text-primary">登入後台</h1>
        <p className="text-sm text-base-300 mt-1">預設帳號：admin@lin.blog，密碼：admin</p>
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
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary outline-none transition focus:ring focus:ring-accent/30"
          defaultValue="admin@lin.blog"
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
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary outline-none transition focus:ring focus:ring-accent/30"
          defaultValue="admin"
        />
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "登入中..." : "登入"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-base-75 flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-base-300">載入中...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

