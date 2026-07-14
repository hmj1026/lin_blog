"use client";

import { Field } from "./field";
import { type AuthoringMode } from "./mode-selector";
import { ContentEditorField } from "./content-editor-field";

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

      <ContentEditorField
        authoringMode={authoringMode}
        onModeChange={onModeChange}
        pendingSwitchTarget={pendingSwitchTarget}
        onConfirmPendingSwitch={onConfirmPendingSwitch}
        onCancelPendingSwitch={onCancelPendingSwitch}
        content={content}
        onContentChange={onContentChange}
        allowRawHtml={allowRawHtml}
        showRawHtmlToc={showRawHtmlToc}
        onShowRawHtmlTocChange={onShowRawHtmlTocChange}
        showRichHtmlWarning={showRichHtmlWarning}
      />
    </div>
  );
}
