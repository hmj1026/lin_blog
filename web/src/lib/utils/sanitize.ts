import sanitizeHtml from "sanitize-html";

export function sanitizePostHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "cite",
      "a",
      "img",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": [],
    },
    allowedSchemes: ["http", "https", "data"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: true,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

/**
 * 移除常見的危險 CSS 構造（expression()/-moz-binding/behavior/@import/url(javascript:)）。
 * 注意：此為輕量正則的「縱深防禦」層，並非唯一防線 —— 可被 CSS 註解/跳脫等手法規避；
 * 原始 HTML 文章的真正安全邊界是渲染時的 iframe sandbox（無 allow-same-origin，內容為 null origin）。
 * 且 expression()/behavior/-moz-binding 於現代瀏覽器早已失效，此處僅作額外硬化。
 */
export function stripDangerousCss(cssText: string): string {
  if (!cssText) return cssText;
  return cssText
    // 移除 CSS expression()（IE 遺留的可執行 CSS）
    .replace(/expression\s*\(/gi, "/*blocked*/(")
    // 移除 -moz-binding（XBL 綁定可執行腳本）
    .replace(/-moz-binding\s*:[^;}]*/gi, "")
    // 移除 behavior:（含 -ms- 前綴；IE htc 行為）
    .replace(/(?:-\w+-)?behavior\s*:[^;}]*/gi, "")
    // 移除 url() 內的 javascript:/vbscript:
    .replace(/url\(\s*(['"]?)\s*(?:javascript|vbscript):[^)]*\1\s*\)/gi, "url()")
    // 移除 @import（封鎖本地與遠端匯入）
    .replace(/@import[^;]*;?/gi, "");
}

function hardenEmbeddedCss(html: string): string {
  return html
    // <style>...</style> 區塊內容
    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, open, css, close) => `${open}${stripDangerousCss(css)}${close}`)
    // style="..." 屬性值
    .replace(/(\sstyle\s*=\s*")([^"]*)(")/gi, (_m, p, css, s) => `${p}${stripDangerousCss(css)}${s}`)
    // style='...' 屬性值
    .replace(/(\sstyle\s*=\s*')([^']*)(')/gi, (_m, p, css, s) => `${p}${stripDangerousCss(css)}${s}`);
}

export function sanitizeRawPostHtml(html: string): string {
  const sanitized = sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "strong", "em", "u", "s", "b", "i", "sub", "sup", "mark", "small",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "dl", "dt", "dd",
      "blockquote", "cite", "q",
      "a", "img", "figure", "figcaption",
      "code", "pre",
      "div", "span", "section", "article", "header", "footer", "aside", "main", "nav",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
      "style",
    ],
    // 明確屬性白名單：不含任何 on* 事件屬性
    allowedAttributes: {
      "*": ["class", "style", "id", "align", "title", "data-*"],
      a: ["href", "name", "target", "rel", "title", "class", "style", "id"],
      img: ["src", "alt", "title", "width", "height", "class", "style", "id"],
      td: ["colspan", "rowspan", "align", "valign", "class", "style", "id"],
      th: ["colspan", "rowspan", "align", "valign", "scope", "class", "style", "id"],
      col: ["span", "class", "style"],
      colgroup: ["span", "class", "style"],
    },
    // data: 僅允許用於 img（避免 data: 被用於 a/其他標籤導向）
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: true,
    // 保留 <style> 標籤內容：預設 nonTextTags 會丟棄 style 內文，這裡移除 style
    nonTextTags: ["script", "textarea", "option", "noscript"],
    // 明確承認允許 <style>（其 CSS 由 hardenEmbeddedCss 過濾，iframe sandbox 為第二道防線）
    allowVulnerableTags: true,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
  return hardenEmbeddedCss(sanitized);
}

