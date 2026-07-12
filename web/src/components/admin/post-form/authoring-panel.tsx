"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Field } from "./field";
import { RawHtmlField } from "./raw-html-field";
import { ModeSelector, type AuthoringMode } from "./mode-selector";

const TiptapEditor = dynamic(
  () => import("@/components/admin/tiptap-editor").then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[360px] animate-pulse rounded-2xl border border-line bg-white shadow-card" />
    ),
  }
);

type AuthoringPanelProps = {
  title: string;
  onTitleChange: (value: string) => void;
  slug: string;
  onSlugChange: (value: string) => void;
  excerpt: string;
  onExcerptChange: (value: string) => void;
  authoringMode: AuthoringMode;
  onModeChange: (mode: AuthoringMode) => void;
  pendingSwitchTarget: AuthoringMode | null;
  onConfirmPendingSwitch: () => void;
  onCancelPendingSwitch: () => void;
  content: string;
  onContentChange: (value: string) => void;
  allowRawHtml: boolean;
  showRawHtmlToc: boolean;
  onShowRawHtmlTocChange: (value: boolean) => void;
  showRichHtmlWarning: boolean;
};

/**
 * 主要撰寫欄：標題、Slug、摘要、模式選擇器、內容編輯器。
 */
export function AuthoringPanel({
  title,
  onTitleChange,
  slug,
  onSlugChange,
  excerpt,
  onExcerptChange,
  authoringMode,
  onModeChange,
  pendingSwitchTarget,
  onConfirmPendingSwitch,
  onCancelPendingSwitch,
  content,
  onContentChange,
  allowRawHtml,
  showRawHtmlToc,
  onShowRawHtmlTocChange,
  showRichHtmlWarning,
}: AuthoringPanelProps) {
  return (
    <div data-testid="post-form-main" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* 標題 */}
        <Field label="標題" htmlFor="post-title">
          <input
            id="post-title"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="文章標題"
          />
        </Field>

        {/* Slug */}
        <Field label="Slug（網址）" htmlFor="post-slug">
          <input
            id="post-slug"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="例如：my-first-post"
          />
        </Field>
      </div>

      {/* 摘要 */}
      <Field label="摘要" htmlFor="post-excerpt">
        <textarea
          id="post-excerpt"
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
          value={excerpt}
          onChange={(e) => onExcerptChange(e.target.value)}
          rows={3}
          placeholder="列表與 SEO 使用"
        />
      </Field>

      {/* 內容編輯器 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-primary">內容</div>
          <ModeSelector mode={authoringMode} onChange={onModeChange} />
        </div>
        {pendingSwitchTarget && (
          <div
            data-testid="mode-switch-warning"
            className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
          >
            <p>
              切換為「視覺編輯器」將不可逆地剝除區塊結構與 inline 樣式（<code>&lt;div&gt;</code>
              、<code>style=</code>、<code>&lt;style&gt;</code>），且會在後續視覺編輯與儲存時持續套用嚴格
              sanitize。此動作無法還原，請確認是否繼續切換。
            </p>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" onClick={onConfirmPendingSwitch}>
                確認切換
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onCancelPendingSwitch}>
                取消
              </Button>
            </div>
          </div>
        )}
        {allowRawHtml ? (
          <RawHtmlField value={content} onChange={onContentChange} />
        ) : (
          <TiptapEditor value={content} onChange={onContentChange} />
        )}
        {allowRawHtml ? (
          <>
            <p className="text-xs text-amber-600">
              原始 HTML 模式：內容以純文字 HTML 儲存並保留自訂樣式，僅移除 &lt;script&gt;、事件屬性與危險 CSS；
              前台以隔離 iframe 呈現，站台全域樣式不影響本文、本文樣式也不外洩；目錄僅支援點擊跳轉（無捲動高亮）。
            </p>
            <div className="space-y-1">
              <label
                htmlFor="post-show-raw-html-toc"
                className="flex items-center gap-2 text-sm text-primary"
              >
                <input
                  id="post-show-raw-html-toc"
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={showRawHtmlToc}
                  onChange={(e) => onShowRawHtmlTocChange(e.target.checked)}
                />
                顯示系統自動目錄
              </label>
              <p className="text-xs text-base-300">
                你也可以自行在 HTML 內容中提供目錄；未啟用此選項時，系統不會自動產生目錄。
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs text-base-300">內容會以 HTML 字串儲存，儲存時 server 會做 sanitize。</p>
        )}
        {!allowRawHtml && showRichHtmlWarning && (
          <div
            data-testid="rich-html-warning"
            className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700"
          >
            <p>
              偵測到內容含有區塊結構或自訂樣式（例如 &lt;div&gt;、style=、&lt;style&gt;）；
              一般模式會不可逆地剝除區塊結構與 inline 樣式。
            </p>
            <button
              type="button"
              className="mt-1 font-semibold underline"
              onClick={() => onModeChange("raw")}
            >
              切換為原始 HTML 模式
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
