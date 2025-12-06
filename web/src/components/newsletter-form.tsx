"use client";

import { FormEvent, useState } from "react";

interface NewsletterFormProps {
  /** 使用緊湊版型（適合側邊欄等狹窄空間） */
  compact?: boolean;
}

export function NewsletterForm({ compact = false }: NewsletterFormProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    if (!email || !email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("success");
  };

  // 緊湊模式：適合側邊欄
  if (compact) {
    return (
      <div
        id="newsletter"
        className="relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-soft dark:bg-base-100 dark:border-base-200"
      >
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-orange-50/50 via-transparent to-sky-50/50 dark:from-amber-500/5 dark:via-transparent dark:to-violet-500/5" />
        <div className="relative space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">Newsletter</p>
            <h3 className="font-display text-base text-primary leading-snug">每週精選內容策略</h3>
            <p className="text-xs text-base-300 dark:text-base-600 leading-relaxed">
              訂閱獲取最新文章與工作坊資訊。
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              required
              placeholder="你的 Email"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-primary shadow-inner outline-none ring-accent/30 transition focus:ring dark:bg-base-150 dark:border-base-200 dark:text-primary dark:placeholder:text-base-500"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-brand/90 dark:bg-amber-500 dark:text-stone-900 dark:hover:bg-amber-400"
            >
              訂閱電子報
            </button>
          </form>
          {status === "success" && (
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
              感謝訂閱！請至信箱確認。
            </p>
          )}
          {status === "error" && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              Email 格式不正確。
            </p>
          )}
        </div>
      </div>
    );
  }

  // 標準模式：適合寬容器（首頁等）
  return (
    <div
      id="newsletter"
      className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-soft dark:bg-base-100 dark:border-base-200 lg:p-10"
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-orange-50/50 via-transparent to-sky-50/50 dark:from-amber-500/5 dark:via-transparent dark:to-violet-500/5" />
      <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">Newsletter</p>
          <h3 className="font-display text-xl text-primary lg:text-2xl">每週兩封，帶你精讀內容策略與設計實務</h3>
          <p className="text-sm text-base-300 dark:text-base-600">
            以繁體中文精選案例、框架與模板。訂閱後將收到最新文章與工作坊第一手資訊。
          </p>
        </div>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            required
            placeholder="輸入你的 Email"
            className="w-full rounded-full border border-line bg-white px-4 py-3 text-sm text-primary shadow-inner outline-none ring-accent/30 transition focus:ring dark:bg-base-150 dark:border-base-200 dark:text-primary dark:placeholder:text-base-500"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand/90 dark:bg-amber-500 dark:text-stone-900 dark:hover:bg-amber-400 lg:w-auto"
          >
            立即訂閱
          </button>
        </form>
        {status === "success" && (
          <p className="relative text-sm font-semibold text-teal-700 dark:text-teal-400 lg:col-span-2">
            感謝訂閱！請至信箱確認開通信件。
          </p>
        )}
        {status === "error" && (
          <p className="relative text-sm font-semibold text-rose-600 dark:text-rose-400 lg:col-span-2">
            Email 格式看起來不正確，請重新輸入。
          </p>
        )}
      </div>
    </div>
  );
}
