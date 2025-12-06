"use client";

import { useState } from "react";

type ShareButtonsProps = {
  url: string;
  title: string;
};

/**
 * 社群分享按鈕元件
 * 支援 Facebook、Twitter、LINE、複製連結
 * 針對狹窄側邊欄優化，使用 2x2 grid 佈局
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

  const buttonBase = "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition";

  return (
    <div className="grid grid-cols-4 gap-2">
      {/* Facebook */}
      <button
        onClick={() => openShareWindow("facebook")}
        className={`${buttonBase} border-line bg-white dark:bg-base-100 text-[#1877F2] hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]`}
        aria-label="分享到 Facebook"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" />
        </svg>
      </button>

      {/* Twitter/X */}
      <button
        onClick={() => openShareWindow("twitter")}
        className={`${buttonBase} border-line bg-white dark:bg-base-100 text-black dark:text-white hover:bg-black hover:text-white hover:border-black`}
        aria-label="分享到 Twitter"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* LINE */}
      <button
        onClick={() => openShareWindow("line")}
        className={`${buttonBase} border-line bg-white dark:bg-base-100 text-[#00B900] hover:bg-[#00B900] hover:text-white hover:border-[#00B900]`}
        aria-label="分享到 LINE"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 5.813 2 10.5c0 3.684 2.75 6.798 6.536 7.8-.257.913-.923 3.255-.958 3.451 0 0-.019.152.072.21.091.059.199.015.199.015.264-.037 3.061-2.013 3.545-2.361.865.122 1.764.185 2.606.185 5.523 0 10-3.813 10-8.5S17.523 2 12 2z" />
        </svg>
      </button>

      {/* 複製連結 */}
      <button
        onClick={handleCopy}
        className={`${buttonBase} ${
          copied
            ? "border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20"
            : "border-line bg-white dark:bg-base-100 text-primary hover:border-primary/40 hover:bg-base-50"
        }`}
        aria-label="複製連結"
        title={copied ? "已複製" : "複製連結"}
      >
        {copied ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

