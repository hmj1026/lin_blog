"use client";

import { FormEvent, useState } from "react";

export function ContactCard() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sent");
  };

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-line bg-primary p-10 text-white shadow-soft"
      id="contact"
    >
      <div className="absolute inset-0 opacity-70">
        <div className="h-full w-full bg-grid-light [mask-image:radial-gradient(ellipse_at_center,rgba(255,255,255,0.9),transparent_75%)]" />
      </div>
      <div className="relative grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-200">合作與顧問</p>
          <h3 className="font-display text-3xl leading-tight">需要內容策略、設計審視或社群啟動？</h3>
          <p className="text-sm text-slate-200">
            簡述你的需求與時程，我們將提供一份初步建議與時間表。表單送出後會在 48 小時內回覆。
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="name"
              required
              placeholder="你的名字"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-orange-300/40 transition placeholder:text-slate-200 focus:ring"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="聯絡 Email"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-orange-300/40 transition placeholder:text-slate-200 focus:ring"
            />
          </div>
          <textarea
            name="message"
            required
            rows={3}
            placeholder="簡述需求、時程或預算範圍"
            className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none ring-orange-300/40 transition placeholder:text-slate-200 focus:ring"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-primary shadow-card transition hover:-translate-y-0.5 md:w-auto"
          >
            送出訊息
          </button>
          {status === "sent" && <p className="text-sm text-orange-200">已收到！我會在 48 小時內回覆。</p>}
        </form>
      </div>
    </div>
  );
}
