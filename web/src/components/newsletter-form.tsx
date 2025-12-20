"use client";

import { FormEvent, useState } from "react";

export function NewsletterForm() {
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

  return (
    <div
      id="newsletter"
      className="relative overflow-hidden rounded-3xl border border-line bg-white p-10 shadow-soft"
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-orange-50/50 via-transparent to-sky-50/50" />
      <div className="relative grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">Newsletter</p>
          <h3 className="font-display text-2xl text-primary">每週兩封，帶你精讀內容策略與設計實務</h3>
          <p className="text-sm text-base-300">
            以繁體中文精選案例、框架與模板。訂閱後將收到最新文章與工作坊第一手資訊。
          </p>
        </div>
        <form className="flex flex-col gap-3 md:flex-row md:items-center" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            required
            placeholder="輸入你的 Email"
            className="w-full rounded-full border border-line bg-white px-4 py-3 text-sm text-primary shadow-inner outline-none ring-accent/30 transition focus:ring"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90"
          >
            立即訂閱
          </button>
        </form>
        {status === "success" && (
          <p className="relative text-sm font-semibold text-teal-700 md:col-span-2">
            感謝訂閱！請至信箱確認開通信件。
          </p>
        )}
        {status === "error" && (
          <p className="relative text-sm font-semibold text-rose-600 md:col-span-2">
            Email 格式看起來不正確，請重新輸入。
          </p>
        )}
      </div>
    </div>
  );
}
