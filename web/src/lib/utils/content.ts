import { publicEnv } from "@/env.public";
import { processHeadings, type TocItem } from "@/lib/utils/toc";

function isAbsoluteUrl(value: string) {
  return /^(https?:)?\/\//i.test(value) || /^(data|blob):/i.test(value);
}

export function resolveUploadUrl(value: string) {
  if (!value) return value;
  if (isAbsoluteUrl(value)) return value;

  const base = publicEnv.NEXT_PUBLIC_UPLOAD_BASE_URL;
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  if (!base) return normalizedPath;
  return `${base.replace(/\/+$/, "")}${normalizedPath}`;
}

function rewriteImgSrc(html: string) {
  return html.replace(/(<img\b[^>]*?\ssrc\s*=\s*)(["'])([^"']*)(\2)/gi, (_match, prefix, quote, src) => {
    const resolved = resolveUploadUrl(src);
    return `${prefix}${quote}${resolved}${quote}`;
  });
}

/**
 * 處理文章 HTML 內容：標題 ID 處理、圖片路徑重寫。
 * 安全過濾不在此處——渲染端統一由 content-pipeline 的 prepareForRender
 * 在 mode=false 時以 sanitizePostHtml 嚴格重消毒後才委派進來。
 *
 * @param html - 已消毒的文章 HTML
 * @returns { html: 處理後的 HTML, tocItems: 目錄項目清單 }
 * 內部使用：本函式為 content-pipeline 的內部實作，頁面請改用 `@/lib/content-pipeline` 的 `prepareForRender`。
 */
export function prepareContent(html: string): {
  html: string;
  tocItems: TocItem[];
} {
  if (!html) return { html: "", tocItems: [] };

  // 1. 處理標題 ID（使用 cheerio，一次解析）
  const { html: withIds, items } = processHeadings(html);

  // 2. 重寫圖片路徑
  const final = rewriteImgSrc(withIds);

  return { html: final, tocItems: items };
}

/**
 * 原始 HTML 模式的內容處理：內容已於儲存時由 sanitizeRawPostHtml 消毒，
 * 此處「不」再做嚴格重消毒（保留 class/style/<style>），
 * 僅補標題 ID（供 ToC 錨點）與重寫圖片路徑。回傳的 html 為 iframe body 可直接使用的片段。
 *
 * @param html - 已消毒的原始 HTML 內容
 * @returns { html: 處理後的 HTML 片段, tocItems: 目錄項目清單 }
 * 內部使用：本函式為 content-pipeline 的內部實作，頁面請改用 `@/lib/content-pipeline` 的 `prepareForRender`。
 */
export function prepareRawHtmlContent(html: string): {
  html: string;
  tocItems: TocItem[];
} {
  if (!html) return { html: "", tocItems: [] };

  // 1. 補標題 ID（processHeadings 透過 cheerio 會包上 <html><head></head><body>…）
  const { html: withIds, items } = processHeadings(html);

  // 2. 重寫圖片路徑
  const rewritten = rewriteImgSrc(withIds);

  // 3. 取出 body 內容；cheerio（parse5 文件模式）可能把頂層 <style> 提升到 <head>，
  //    因此需一併取回 head 內的 <style> 並前置到內容前，避免自訂樣式在僅取 body 時遺失。
  const headMatch = rewritten.match(/<head>([\s\S]*?)<\/head>/i);
  const headStyles = headMatch ? (headMatch[1].match(/<style[\s\S]*?<\/style>/gi) || []).join("") : "";
  const bodyMatch = rewritten.match(/<body>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : rewritten;
  const finalHtml = headStyles + bodyHtml;

  return { html: finalHtml, tocItems: items };
}
