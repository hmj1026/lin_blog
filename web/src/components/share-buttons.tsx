"use client";

import { useState } from "react";

type ShareButtonsProps = {
  url: string;
  title: string;
};

/**
 * 社群分享按鈕元件
 * 支援 Facebook、Twitter、LINE、複製連結
 */
export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降級方案
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openShareWindow = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], "_blank", "width=600,height=400");
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-base-300">分享：</span>
      
      {/* Facebook */}
      <button
        onClick={() => openShareWindow("facebook")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-[#1877F2] transition hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]"
        aria-label="分享到 Facebook"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" />
        </svg>
      </button>

      {/* Twitter/X */}
      <button
        onClick={() => openShareWindow("twitter")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-black transition hover:bg-black hover:text-white hover:border-black"
        aria-label="分享到 Twitter"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* LINE */}
      <button
        onClick={() => openShareWindow("line")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-[#00B900] transition hover:bg-[#00B900] hover:text-white hover:border-[#00B900]"
        aria-label="分享到 LINE"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 5.813 2 10.5c0 3.684 2.75 6.798 6.536 7.8-.257.913-.923 3.255-.958 3.451 0 0-.019.152.072.21.091.059.199.015.199.015.264-.037 3.061-2.013 3.545-2.361.865.122 1.764.185 2.606.185 5.523 0 10-3.813 10-8.5S17.523 2 12 2z" />
        </svg>
      </button>

      {/* 複製連結 */}
      <button
        onClick={handleCopy}
        className={`flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition ${
          copied
            ? "border-green-500 bg-green-50 text-green-600"
            : "border-line bg-white text-primary hover:border-primary/40"
        }`}
        aria-label="複製連結"
      >
        {copied ? (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            已複製
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            複製連結
          </>
        )}
      </button>
    </div>
  );
}
