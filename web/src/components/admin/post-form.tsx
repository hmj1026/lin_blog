"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  type PostStatus,
  type CategoryOption,
  type TagOption,
  type PostFormData,
  slugify,
  parseJson,
  formatDateTime,
} from "./post-form/index";
import { Field } from "./post-form/field";
import { Picker } from "./post-form/picker";
import { PreviewModal } from "./post-form/preview-modal";
import { CoverUploader } from "./post-form/cover-uploader";
import { detectStrippedRichHtml } from "@/lib/utils/detect-rich-html";

const TiptapEditor = dynamic(
  () => import("@/components/admin/tiptap-editor").then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[360px] animate-pulse rounded-2xl border border-line bg-white shadow-card" />
    ),
  }
);

type Props = {
  mode: "create" | "edit";
  postId?: string;
  initial: PostFormData;
  categories: CategoryOption[];
  tags: TagOption[];
};

export function AdminPostForm({ mode, postId, initial, categories, tags }: Props) {
  const router = useRouter();

  // 表單狀態
  const [slug, setSlug] = useState(initial.slug);
  const [title, setTitle] = useState(initial.title);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [content, setContent] = useState(initial.content);
  const [coverImage, setCoverImage] = useState(initial.coverImage ?? "");
  const [readingTime, setReadingTime] = useState(initial.readingTime ?? "");
  const [featured, setFeatured] = useState(initial.featured);
  const [allowRawHtml, setAllowRawHtml] = useState(initial.allowRawHtml);
  const [status, setStatus] = useState<PostStatus>(initial.status);
  const [publishedAt, setPublishedAt] = useState(initial.publishedAt ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(initial.categoryIds);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  // SEO 欄位
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription ?? "");
  const [ogImage, setOgImage] = useState(initial.ogImage ?? "");

  // UI 狀態
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [timeFormat, setTimeFormat] = useState<"24h" | "12h">("24h");

  const canSubmit = useMemo(() => {
    return slug.trim() && title.trim() && excerpt.trim() && content.trim();
  }, [slug, title, excerpt, content]);

  const showRichHtmlWarning = useMemo(
    () => !allowRawHtml && detectStrippedRichHtml(content),
    [allowRawHtml, content]
  );

  function validateBeforeSubmit() {
    if (!slug.trim()) return "請輸入 slug";
    if (!title.trim()) return "請輸入標題";
    if (!excerpt.trim()) return "請輸入摘要";
    if (!content.trim() || content.trim() === "<p></p>") return "請輸入內容";
    if (publishedAt && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(publishedAt)) {
      return "發佈時間格式不正確";
    }
    return null;
  }

  function formatPublishedAtPreview() {
    if (!publishedAt) return "";
    const date = new Date(publishedAt);
    if (Number.isNaN(date.getTime())) return "";
    return formatDateTime(date, timeFormat);
  }

  async function submit() {
    setSaving(true);
    setMessage(null);
    try {
      const error = validateBeforeSubmit();
      if (error) throw new Error(error);

      if (!allowRawHtml && detectStrippedRichHtml(content)) {
        const confirmed = window.confirm(
          "一般模式將不可逆地剝除區塊結構與 inline 樣式（<div>/style=/<style>）。確定要以一般模式儲存嗎？改用「原始 HTML 模式」可保留樣式。"
        );
        if (!confirmed) {
          setSaving(false);
          return;
        }
      }

      const payload = {
        slug: slug.trim(),
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        coverImage: coverImage.trim() ? coverImage.trim() : null,
        readingTime: readingTime.trim() ? readingTime.trim() : null,
        featured,
        allowRawHtml,
        status,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        categoryIds,
        tagIds,
        seoTitle: seoTitle.trim() ? seoTitle.trim() : null,
        seoDescription: seoDescription.trim() ? seoDescription.trim() : null,
        ogImage: ogImage.trim() ? ogImage.trim() : null,
      };

      const res =
        mode === "create"
          ? await fetch("/api/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/posts/${postId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const json = await parseJson<unknown>(res);
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.message || "儲存失敗" : "儲存失敗");
      }
      router.push("/admin/posts");
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl text-primary">
            {mode === "create" ? "新增文章" : "編輯文章"}
          </h1>
          {mode === "edit" && slug.trim() && (
            <Button type="button" size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
              預覽
            </Button>
          )}
        </div>
        <Link href="/admin/posts" className="text-sm font-semibold text-accent-600">
          返回列表
        </Link>
      </div>

      {/* 表單 */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* 標題 */}
          <Field label="標題" htmlFor="post-title">
            <input
              id="post-title"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                if (!initial.title && (!slug || slug === slugify(title)))
                  setSlug(slugify(next));
              }}
              placeholder="文章標題"
            />
          </Field>

          {/* Slug */}
          <Field label="Slug（網址）" htmlFor="post-slug">
            <input
              id="post-slug"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="例如：my-first-post"
            />
          </Field>

          {/* 摘要 */}
          <Field label="摘要" htmlFor="post-excerpt">
            <textarea
              id="post-excerpt"
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              placeholder="列表與 SEO 使用"
            />
          </Field>

          {/* 狀態與發佈時間 */}
          <div className="grid gap-4">
            <Field label="狀態">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-primary"
                    checked={status === "DRAFT"}
                    onChange={() => setStatus("DRAFT")}
                  />
                  草稿
                </label>
                <label className="flex items-center gap-2 text-sm text-primary">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-primary"
                    checked={status === "PUBLISHED"}
                    onChange={() => setStatus("PUBLISHED")}
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
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
                <div className="flex items-center justify-between text-xs text-base-300">
                  <div>{formatPublishedAtPreview() ? `顯示：${formatPublishedAtPreview()}` : "未設定"}</div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={timeFormat === "12h"}
                      onChange={(e) => setTimeFormat(e.target.checked ? "12h" : "24h")}
                    />
                    AM/PM
                  </label>
                </div>
              </div>
            </Field>
          </div>

          {/* 封面上傳 */}
          <CoverUploader
            coverImage={coverImage}
            onCoverChange={setCoverImage}
            onError={setMessage}
          />

          {/* 閱讀時間與精選 */}
          <div className="grid gap-4">
            <Field label="閱讀時間（可空）" htmlFor="post-reading-time">
              <input
                id="post-reading-time"
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
                value={readingTime}
                onChange={(e) => setReadingTime(e.target.value)}
                placeholder="例如：8 分鐘"
              />
            </Field>
            <label className="flex items-center gap-3 text-sm text-primary">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              精選文章（首頁 Featured）
            </label>
          </div>
        </div>

        {/* 內容編輯器與分類/標籤 */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-primary">內容</div>
              <label className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={allowRawHtml}
                  onChange={(e) => setAllowRawHtml(e.target.checked)}
                />
                原始 HTML 模式
              </label>
            </div>
            {allowRawHtml ? (
              <textarea
                data-testid="raw-html-editor"
                className="min-h-[360px] w-full rounded-2xl border border-line bg-white p-4 font-mono text-sm text-primary"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="直接輸入 HTML（可含 <style>）；儲存時仍會移除 <script>、事件屬性與危險 CSS。"
              />
            ) : (
              <TiptapEditor value={content} onChange={setContent} />
            )}
            {allowRawHtml ? (
              <p className="text-xs text-amber-600">
                原始 HTML 模式：內容以純文字 HTML 儲存並保留自訂樣式，僅移除 &lt;script&gt;、事件屬性與危險 CSS；
                前台以隔離 iframe 呈現，站台全域樣式不影響本文、本文樣式也不外洩；目錄僅支援點擊跳轉（無捲動高亮）。
              </p>
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
                  onClick={() => setAllowRawHtml(true)}
                >
                  切換為原始 HTML 模式
                </button>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <Picker
              title="分類（可多選）"
              options={categories}
              selected={categoryIds}
              onToggle={(id) =>
                setCategoryIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
              }
            />
            <Picker
              title="標籤（可多選）"
              options={tags}
              selected={tagIds}
              onToggle={(id) =>
                setTagIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
              }
            />
            
            {/* SEO 設定 */}
            <div className="rounded-2xl border border-line bg-base-50 p-4 space-y-4">
              <div className="text-sm font-semibold text-primary">SEO 設定（選填）</div>
              <Field label="SEO 標題" htmlFor="seo-title">
                <input
                  id="seo-title"
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="自訂搜尋引擎標題（留空使用文章標題）"
                />
              </Field>
              <Field label="SEO 描述" htmlFor="seo-description">
                <textarea
                  id="seo-description"
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
                  rows={2}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="自訂搜尋引擎描述（留空使用摘要）"
                />
              </Field>
              <Field label="OG 圖片" htmlFor="og-image">
                <input
                  id="og-image"
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-primary"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="社群分享縮圖網址（留空使用封面）"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* 送出 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-base-300">{message}</div>
          <Button type="button" onClick={submit} disabled={!canSubmit || saving}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
        </div>
      </div>

      {/* 預覽 Modal */}
      {previewOpen && <PreviewModal slug={slug} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
