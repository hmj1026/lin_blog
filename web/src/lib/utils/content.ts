import { publicEnv } from "@/env.public";

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

export function sanitizeAndPrepareHtml(html: string) {
  const safe = stripDangerousAttributes(html);
  return rewriteImgSrc(safe);
}
