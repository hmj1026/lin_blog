"use client";

import { FormEvent, useState } from "react";

type SocialLinks = {
  showFacebook: boolean;
  facebookUrl: string | null;
  showInstagram: boolean;
  instagramUrl: string | null;
  showThreads: boolean;
  threadsUrl: string | null;
  showLine: boolean;
  lineUrl: string | null;
};

type Props = {
  socialLinks?: SocialLinks;
};

export function ContactCard({ socialLinks }: Props) {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sent");
  };

  const hasSocialLinks = socialLinks && (
    socialLinks.showFacebook || socialLinks.showInstagram || 
    socialLinks.showThreads || socialLinks.showLine
  );

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-line bg-brand p-10 text-white shadow-soft"
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
          {/* Social Links */}
          {hasSocialLinks && (
            <div className="flex gap-3 pt-2">
              {socialLinks.showFacebook && socialLinks.facebookUrl && (
                <a
                  href={socialLinks.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  title="Facebook"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {socialLinks.showInstagram && socialLinks.instagramUrl && (
                <a
                  href={socialLinks.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  title="Instagram"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {socialLinks.showThreads && socialLinks.threadsUrl && (
                <a
                  href={socialLinks.threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  title="Threads"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.812-.674 1.928-1.077 3.486-1.264.93-.111 1.785-.105 2.479-.105h.197c-.106-.627-.343-1.074-.706-1.33-.44-.31-1.109-.479-1.994-.479-.913 0-1.643.159-2.119.46a1.458 1.458 0 0 0-.685 1.298h-2.045c.032-1.198.499-2.178 1.388-2.915.953-.79 2.181-1.19 3.461-1.19 1.474 0 2.67.347 3.551 1.032.94.731 1.417 1.81 1.417 3.208v.397c.666.063 1.29.186 1.86.369 1.705.545 2.953 1.511 3.717 2.878.865 1.548.997 3.627-.263 5.86-1.058 1.876-2.892 3.218-5.455 3.992-1.36.41-2.86.618-4.46.618zm-.222-9.67c-2.273.138-3.381 1.006-3.317 2.2.04.74.483 1.274 1.161 1.58.548.247 1.204.334 1.808.3 1.291-.07 2.088-.549 2.656-1.254.448-.557.77-1.31.897-2.283-.45-.02-.94-.04-1.475-.04h-.188l-1.542-.003z" />
                  </svg>
                </a>
              )}
              {socialLinks.showLine && socialLinks.lineUrl && (
                <a
                  href={socialLinks.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  title="LINE"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </a>
              )}
            </div>
          )}
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
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-primary shadow-card transition hover:-translate-y-0.5 md:w-auto dark:text-base-100"
          >
            送出訊息
          </button>
          {status === "sent" && <p className="text-sm text-orange-200">已收到！我會在 48 小時內回覆。</p>}
        </form>
      </div>
    </div>
  );
}

