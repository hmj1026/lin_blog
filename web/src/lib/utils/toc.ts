/**
 * TOC (Table of Contents) 工具函式
 * 用於解析 HTML 內容中的標題，生成目錄索引
 * 
 * 使用 cheerio 進行安全的 HTML 解析，支援：
 * - 巢狀標籤（如 <h2><code>Title</code></h2>）
 * - HTML entities（&amp;, &lt; 等）
 * - 換行與空白
 * - 重複 ID 檢測
 */

import * as cheerio from "cheerio";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

/**
 * 為 HTML 中的 H2/H3 標題添加唯一 ID，並回傳標題清單
 * 
 * 此函式整合了 ID 產生與標題擷取邏輯，確保：
 * 1. 所有 H2/H3 都有唯一 ID（已有 ID 保留，無 ID 自動產生）
 * 2. 回傳的 TocItem 陣列與處理後的 HTML 完全一致
 * 3. 避免 ID 碰撞（檢查既有 ID，產生唯一編號）
 * 
 * @param html - 文章 HTML 內容
 * @returns { html: 處理後的 HTML, items: TocItem 陣列 }
 */
export function processHeadings(html: string): {
  html: string;
  items: TocItem[];
} {
  if (!html) return { html: "", items: [] };

  const $ = cheerio.load(html, {
    decodeEntities: true, // 解碼 HTML entities
  });

  const items: TocItem[] = [];
  const existingIds = new Set<string>();

  // 先掃描所有既有 ID
  $("h2[id], h3[id]").each((_, el) => {
    const id = $(el).attr("id");
    if (id) existingIds.add(id);
  });

  let autoIdIndex = 0;

  // 處理所有 H2/H3
  $("h2, h3").each((_, el) => {
    const $el = $(el);
    const level = el.tagName === "h2" ? 2 : 3;
    const text = $el.text().trim();

    // 跳過空標題
    if (!text) return;

    let id = $el.attr("id");

    // 若無 ID，產生唯一 ID
    if (!id) {
      do {
        id = `toc-${autoIdIndex}`;
        autoIdIndex++;
      } while (existingIds.has(id));

      $el.attr("id", id);
      existingIds.add(id);
    }

    items.push({ id, text, level });
  });

  return {
    html: $.html(),
    items,
  };
}

/**
 * 從 HTML 字串中解析 H2/H3 標題（僅讀取，不修改）
 * 
 * @deprecated 建議使用 processHeadings() 以確保 ID 與 HTML 同步
 * @param html - 文章 HTML 內容
 * @returns TocItem 陣列，包含標題 ID、文字與層級
 */
export function extractHeadings(html: string): TocItem[] {
  if (!html) return [];

  const $ = cheerio.load(html, { decodeEntities: true });
  const items: TocItem[] = [];

  $("h2, h3").each((index, el) => {
    const $el = $(el);
    const level = el.tagName === "h2" ? 2 : 3;
    const text = $el.text().trim();

    if (!text) return;

    const id = $el.attr("id") || `toc-${index}`;
    items.push({ id, text, level });
  });

  return items;
}

/**
 * 為 HTML 中無 ID 的 H2/H3 標題添加唯一 ID
 * 
 * @deprecated 建議使用 processHeadings() 以避免重複處理與 ID 不同步問題
 * @param html - 文章 HTML 內容
 * @returns 處理後的 HTML，所有 H2/H3 都有 ID 屬性
 */
export function addHeadingIds(html: string): string {
  if (!html) return html;
  
  const { html: result } = processHeadings(html);
  
  const $ = cheerio.load(result, { decodeEntities: true });
  const bodyContent = $("body").html();
  
  return bodyContent || html;
}
