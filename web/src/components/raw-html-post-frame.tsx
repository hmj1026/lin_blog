"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TocItem } from "@/lib/utils/toc";
import {
  buildRawPostSrcDoc,
  RAW_HTML_FRAME_HEIGHT_MESSAGE as HEIGHT_MESSAGE,
  RAW_HTML_FRAME_SCROLL_MESSAGE as SCROLL_MESSAGE,
  RAW_HTML_FRAME_SCROLL_RESULT_MESSAGE as SCROLL_RESULT_MESSAGE,
  RAW_HTML_FRAME_NAVIGATE_MESSAGE as NAVIGATE_MESSAGE,
} from "@/lib/frontend/raw-srcdoc";

type RawHtmlPostFrameProps = {
  html: string;
  tocItems: TocItem[];
  showRawHtmlToc?: boolean;
};

// 捲動時預留給站台 sticky header 的高度（px）
const SCROLL_HEADER_OFFSET = 80;

/**
 * 原始 HTML 文章的隔離渲染元件：
 * - 以 <iframe sandbox="allow-scripts" srcDoc> 呈現內容（瀏覽器原生雙向 CSS 隔離）
 * - 不啟用 allow-same-origin / allow-top-navigation
 * - 監聽 iframe postMessage 回報的高度以自動調整；ToC 點擊改以 postMessage 通知 iframe 捲動
 */
export function RawHtmlPostFrame({ html, tocItems, showRawHtmlToc = false }: RawHtmlPostFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);
  const srcDoc = useMemo(() => buildRawPostSrcDoc(html), [html]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // 安全檢查：sandbox iframe（無 allow-same-origin）origin 為 "null"，
      // 因此以 event.source 比對本 iframe 的 contentWindow + 訊息型別驗證，
      // 忽略其他來源偽造的訊息。
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const data = event.data as { type?: unknown; height?: unknown; offset?: unknown; href?: unknown };
      if (data && data.type === HEIGHT_MESSAGE && typeof data.height === "number") {
        setHeight(Math.max(200, Math.ceil(data.height)));
      } else if (data && data.type === SCROLL_RESULT_MESSAGE && typeof data.offset === "number") {
        const iframeTop = iframeRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, iframeTop + data.offset - SCROLL_HEADER_OFFSET), behavior: "smooth" });
      } else if (data && data.type === NAVIGATE_MESSAGE && typeof data.href === "string") {
        // 連結來自已消毒內容（限 http/https/mailto）；父頁面於此代為導覽（sandbox 內被擋）。
        if (/^(https?:|mailto:)/i.test(data.href)) {
          window.location.href = data.href;
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function scrollToHeading(id: string) {
    iframeRef.current?.contentWindow?.postMessage({ type: SCROLL_MESSAGE, id }, "*");
  }

  return (
    <div className="space-y-4">
      {/* 系統目錄（opt-in）維持標準 section-shell 寬度，位於寬版 iframe 正上方，不佔用 iframe 旁的固定欄位 */}
      {showRawHtmlToc && tocItems.length >= 2 && (
        <div className="section-shell">
          <nav
            className="inline-toc rounded-2xl border border-line bg-white p-6 shadow-card dark:bg-base-100 dark:border-base-200"
            aria-label="目錄"
          >
            <div className="mb-4 text-lg font-bold text-primary dark:text-amber-200">目錄</div>
            <ol className="space-y-2">
              {tocItems.map((item) => (
                <li key={item.id} className={item.level === 3 ? "ml-6" : ""}>
                  <button
                    type="button"
                    onClick={() => scrollToHeading(item.id)}
                    className="text-left text-primary transition-colors hover:text-purple dark:text-stone-200 dark:hover:text-violet-400"
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}
      {/* iframe 內容階段：接近 layout viewport 寬度的 gutter 外框，不受 section-shell max-width 限制 */}
      <div className="mx-auto w-[calc(100%-32px)] max-w-full">
        <iframe
          ref={iframeRef}
          title="post-content"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="w-full rounded-3xl border border-line bg-white shadow-card"
          style={{ height }}
        />
      </div>
    </div>
  );
}
