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

function stripDangerousAttributes(html: string) {
  return html
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("|\')\s*javascript:[^"\']*\2/gi, "");
}

function rewriteImgSrc(html: string) {
  return html.replace(/(<img\b[^>]*?\ssrc\s*=\s*)(["'])([^"']*)(\2)/gi, (_match, prefix, quote, src) => {
    const resolved = resolveUploadUrl(src);
    return `${prefix}${quote}${resolved}${quote}`;
  });
}

/**
 * 完整處理文章 HTML 內容
 * 一次性完成：安全過濾、標題 ID 處理、圖片路徑重寫
 * 
 * @param html - 原始文章 HTML
 * @returns { html: 處理後的 HTML, tocItems: 目錄項目清單 }
 */
export function prepareContent(html: string): {
  html: string;
  tocItems: TocItem[];
} {
  if (!html) return { html: "", tocItems: [] };

  // 1. 移除危險內容
  const safe = stripDangerousAttributes(html);

  // 2. 處理標題 ID（使用 cheerio，一次解析）
  const { html: withIds, items } = processHeadings(safe);

  // 3. 重寫圖片路徑
  const final = rewriteImgSrc(withIds);

  return { html: final, tocItems: items };
}

/**
 * @deprecated 建議使用 prepareContent() 以獲得 tocItems 避免重複解析
 */
export function sanitizeAndPrepareHtml(html: string): string {
  const { html: result } = prepareContent(html);
  return result;
}

