export const RAW_HTML_FRAME_HEIGHT_MESSAGE = "raw-html-frame:height";
export const RAW_HTML_FRAME_SCROLL_MESSAGE = "raw-html-frame:scrollTo";
export const RAW_HTML_FRAME_SCROLL_RESULT_MESSAGE = "raw-html-frame:scrollResult";
export const RAW_HTML_FRAME_NAVIGATE_MESSAGE = "raw-html-frame:navigate";

/**
 * 組出 iframe 的完整 HTML 文件字串。內容已消毒（無 <script>），
 * 這裡只加入「應用程式自寫」的高度回報 + 捲動控制小腳本。
 *
 * 系統 CSS reset 讓 iframe 使用完整畫布（無 body 內距、無內容 max-width），
 * 讓作者原始 HTML（含 inline style，如 grid/auto-fit/minmax）原樣呈現，不被系統樣式覆蓋。
 */
export function buildRawPostSrcDoc(html: string): string {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, "Noto Sans TC", sans-serif; line-height: 1.7; word-break: break-word; overflow-x: hidden; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
${html}
<script>
(function () {
  var HEIGHT_MESSAGE = ${JSON.stringify(RAW_HTML_FRAME_HEIGHT_MESSAGE)};
  var SCROLL_MESSAGE = ${JSON.stringify(RAW_HTML_FRAME_SCROLL_MESSAGE)};
  var SCROLL_RESULT_MESSAGE = ${JSON.stringify(RAW_HTML_FRAME_SCROLL_RESULT_MESSAGE)};
  var NAVIGATE_MESSAGE = ${JSON.stringify(RAW_HTML_FRAME_NAVIGATE_MESSAGE)};
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
