"use client";

import { Field } from "./field";
import { Picker } from "./picker";
import { CoverUploader } from "./cover-uploader";
import type { PostStatus, CategoryOption, TagOption } from "./types";

type SettingsPanelProps = {
  status: PostStatus;
  onStatusChange: (status: PostStatus) => void;
  publishedAt: string;
  onPublishedAtChange: (value: string) => void;
  publishedAtPreview: string;
  timeFormat: "24h" | "12h";
  onTimeFormatChange: (format: "24h" | "12h") => void;
  coverImage: string;
  onCoverChange: (url: string) => void;
  onCoverError: (message: string) => void;
  readingTime: string;
  onReadingTimeChange: (value: string) => void;
  featured: boolean;
  onFeaturedChange: (value: boolean) => void;
  categories: CategoryOption[];
  categoryIds: string[];
  onCategoryToggle: (id: string) => void;
  tags: TagOption[];
  tagIds: string[];
  onTagToggle: (id: string) => void;
  seoTitle: string;
  onSeoTitleChange: (value: string) => void;
  seoDescription: string;
  onSeoDescriptionChange: (value: string) => void;
  ogImage: string;
  onOgImageChange: (value: string) => void;
};

/**
 * 設定欄：發佈狀態/時間、封面、精選、閱讀時間、分類、標籤、SEO。
 */
export function SettingsPanel({
  status,
  onStatusChange,
  publishedAt,
  onPublishedAtChange,
  publishedAtPreview,
  timeFormat,
  onTimeFormatChange,
  coverImage,
  onCoverChange,
  onCoverError,
  readingTime,
  onReadingTimeChange,
  featured,
  onFeaturedChange,
  categories,
  categoryIds,
  onCategoryToggle,
  tags,
  tagIds,
  onTagToggle,
  seoTitle,
  onSeoTitleChange,
  seoDescription,
  onSeoDescriptionChange,
  ogImage,
  onOgImageChange,
}: SettingsPanelProps) {
  return (
    <div data-testid="post-form-settings" className="space-y-6">
      {/* 狀態與發佈時間 */}
      <div className="grid gap-4">
        <Field label="狀態">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm text-primary">
              <input
                type="radio"
                className="h-4 w-4 accent-primary"
                checked={status === "DRAFT"}
                onChange={() => onStatusChange("DRAFT")}
              />
              草稿
            </label>
            <label className="flex items-center gap-2 text-sm text-primary">
              <input
                type="radio"
                className="h-4 w-4 accent-primary"
                checked={status === "PUBLISHED"}
                onChange={() => onStatusChange("PUBLISHED")}
              />
              已發佈
            </label>
          </div>
        </Field>
        <Field label="發佈時間（可空）" htmlFor="post-published-at">
          <div className="space-y-2">
            <input
              type="datetime-local"
              step={1}
              id="post-published-at"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
              value={publishedAt}
              onChange={(e) => onPublishedAtChange(e.target.value)}
            />
            <div className="flex items-center justify-between text-xs text-base-300">
              <div>{publishedAtPreview ? `顯示：${publishedAtPreview}` : "未設定"}</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={timeFormat === "12h"}
                  onChange={(e) => onTimeFormatChange(e.target.checked ? "12h" : "24h")}
                />
                AM/PM
              </label>
            </div>
          </div>
        </Field>
      </div>

      {/* 封面上傳 */}
      <CoverUploader coverImage={coverImage} onCoverChange={onCoverChange} onError={onCoverError} />

      {/* 閱讀時間與精選 */}
      <div className="grid gap-4">
        <Field label="閱讀時間（可空）" htmlFor="post-reading-time">
          <input
            id="post-reading-time"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
            value={readingTime}
            onChange={(e) => onReadingTimeChange(e.target.value)}
            placeholder="例如：8 分鐘"
          />
        </Field>
        <label className="flex items-center gap-3 text-sm text-primary">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={featured}
            onChange={(e) => onFeaturedChange(e.target.checked)}
          />
          精選文章（首頁 Featured）
        </label>
      </div>

      <Picker
        title="分類（可多選）"
        options={categories}
        selected={categoryIds}
        onToggle={onCategoryToggle}
      />
      <Picker title="標籤（可多選）" options={tags} selected={tagIds} onToggle={onTagToggle} />

      {/* SEO 設定 */}
      <div className="rounded-2xl border border-line bg-base-50 p-4 space-y-4">
        <div className="text-sm font-semibold text-primary">SEO 設定（選填）</div>
        <Field label="SEO 標題" htmlFor="seo-title">
          <input
            id="seo-title"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder="自訂搜尋引擎標題（留空使用文章標題）"
          />
        </Field>
        <Field label="SEO 描述" htmlFor="seo-description">
          <textarea
            id="seo-description"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
            rows={2}
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            placeholder="自訂搜尋引擎描述（留空使用摘要）"
          />
        </Field>
        <Field label="OG 圖片" htmlFor="og-image">
          <input
            id="og-image"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
            value={ogImage}
            onChange={(e) => onOgImageChange(e.target.value)}
            placeholder="社群分享縮圖網址（留空使用封面）"
          />
        </Field>
      </div>
    </div>
  );
}
