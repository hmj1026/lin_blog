import { sanitizePostHtml, sanitizeRawPostHtml } from "@/lib/utils/sanitize";
import { prepareContent, prepareRawHtmlContent } from "@/lib/utils/content";
import type { TocItem } from "@/lib/utils/toc";

/**
 * 內容管線：使用者 HTML 內容從存檔到渲染的單一安全路徑。
 * 模式判斷（allowRawHtml → sanitizer / 渲染策略）只存在於本 module；
 * 存檔端用 sanitizeContentByMode，渲染端用 prepareForRender。
 */

export type RenderStrategy = "iframe" | "inline";

/**
 * 依 allowRawHtml 選擇消毒器：true → 寬鬆（保留 class/style/<style>，仍移除 script/事件屬性/危險 CSS）；
 * false → 嚴格。切換模式時提交的 content 一律以「切換後」模式重新消毒，避免殘留與現行規格不一致的內容。
 */
export function sanitizeContentByMode(content: string, allowRawHtml: boolean): string {
  return allowRawHtml ? sanitizeRawPostHtml(content) : sanitizePostHtml(content);
}

/**
 * 渲染前處理：回傳 { html, tocItems, strategy }，頁面僅依 strategy 決定渲染方式。
 * mode=false 時先以 sanitizePostHtml 嚴格重消毒——即使旗標與已存內容去同步
 * （內容曾以 raw 模式寬鬆消毒），inline 輸出仍不含 <style>/style=/事件屬性。
 */
export function prepareForRender(
  html: string,
  mode: boolean
): { html: string; tocItems: TocItem[]; strategy: RenderStrategy } {
  if (mode) {
    return { ...prepareRawHtmlContent(html), strategy: "iframe" };
  }
  const strict = html ? sanitizePostHtml(html) : html;
  return { ...prepareContent(strict), strategy: "inline" };
}
