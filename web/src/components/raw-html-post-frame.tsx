"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TocItem } from "@/lib/utils/toc";

type RawHtmlPostFrameProps = {
  html: string;
  tocItems: TocItem[];
};

const HEIGHT_MESSAGE = "raw-html-frame:height";
const SCROLL_MESSAGE = "raw-html-frame:scrollTo";
const SCROLL_RESULT_MESSAGE = "raw-html-frame:scrollResult";
const NAVIGATE_MESSAGE = "raw-html-frame:navigate";
// 捲動時預留給站台 sticky header 的高度（px）
const SCROLL_HEADER_OFFSET = 80;

/**
 * 組出 iframe 的完整 HTML 文件字串。內容已消毒（無 <script>），
 * 這裡只加入「應用程式自寫」的高度回報 + 捲動控制小腳本。
 */
function buildSrcDoc(html: string): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; }
  body { padding: 1rem 1.5rem; font-family: system-ui, -apple-system, "Noto Sans TC", sans-serif; line-height: 1.7; word-break: break-word; overflow-x: hidden; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${html}
<script>
(function () {
  var HEIGHT_MESSAGE = ${JSON.stringify(HEIGHT_MESSAGE)};
  var SCROLL_MESSAGE = ${JSON.stringify(SCROLL_MESSAGE)};
  var SCROLL_RESULT_MESSAGE = ${JSON.stringify(SCROLL_RESULT_MESSAGE)};
  var NAVIGATE_MESSAGE = ${JSON.stringify(NAVIGATE_MESSAGE)};
  function reportHeight() {
    var h = document.documentElement.scrollHeight || document.body.scrollHeight;
    parent.postMessage({ type: HEIGHT_MESSAGE, height: h }, "*");
  }
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(reportHeight).observe(document.documentElement);
  }
  window.addEventListener("load", reportHeight);
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (d && d.type === SCROLL_MESSAGE && typeof d.id === "string") {
      var el = document.getElementById(d.id);
      if (el) {
        // iframe 為自動高度（內部無捲軸），故回報標題於文件內的位移，由父頁面捲動主視窗。
        var offset = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
        parent.postMessage({ type: SCROLL_RESULT_MESSAGE, offset: offset }, "*");
      }
    }
  });
  // sandbox（無 allow-top-navigation）會擋掉 iframe 內連結導覽，故攔截連結點擊，
  // 交由父頁面導覽。同頁錨點（# 開頭）也必須攔截：srcdoc 的 base URL 繼承外層頁面，
  // # 連結會被判定為跨文件導覽而讓 iframe 自我重載（遞迴內嵌整頁），不可放行預設；
  // 找得到目標才經既有 SCROLL_RESULT_MESSAGE 通道請父頁面捲動（與側邊欄目錄一致），
  // 空 hash / 找不到目標則攔截後靜默不動作。
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;
    var rawHref = a.getAttribute("href");
    if (!rawHref) return;
    if (rawHref.charAt(0) === "#") {
      ev.preventDefault();
      var id;
      try {
        id = decodeURIComponent(rawHref.slice(1));
      } catch (_e) {
        // 畸形 %-編碼（如 "#%"）：退回原字串查找，不拋錯
        id = rawHref.slice(1);
      }
      var anchorTarget = id ? document.getElementById(id) : null;
      if (!anchorTarget) return;
      var anchorOffset = anchorTarget.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
      parent.postMessage({ type: SCROLL_RESULT_MESSAGE, offset: anchorOffset }, "*");
      return;
    }
    ev.preventDefault();
    parent.postMessage({ type: NAVIGATE_MESSAGE, href: a.href }, "*");
  });
  reportHeight();
})();
</script>
</body>
</html>`;
}

/**
 * 原始 HTML 文章的隔離渲染元件：
 * - 以 <iframe sandbox="allow-scripts" srcDoc> 呈現內容（瀏覽器原生雙向 CSS 隔離）
 * - 不啟用 allow-same-origin / allow-top-navigation
 * - 監聽 iframe postMessage 回報的高度以自動調整；ToC 點擊改以 postMessage 通知 iframe 捲動
 */
export function RawHtmlPostFrame({ html, tocItems }: RawHtmlPostFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);
  const srcDoc = useMemo(() => buildSrcDoc(html), [html]);

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
      {tocItems.length >= 2 && (
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
      )}
      <iframe
        ref={iframeRef}
        title="post-content"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        className="w-full rounded-3xl border border-line bg-white shadow-card"
        style={{ height }}
      />
    </div>
  );
}
