"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { PreviewModal } from "./post-form/preview-modal";
import { type AuthoringMode } from "./post-form/mode-selector";
import { ActionBar } from "./post-form/action-bar";
import { AuthoringPanel } from "./post-form/authoring-panel";
import { SettingsPanel } from "./post-form/settings-panel";
import { detectStrippedRichHtml } from "@/lib/utils/detect-rich-html";

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
  // 文章層級的 authoring mode（單一擁有者）：allowRawHtml 由此推導，不另存分歧欄位。
  const [authoringMode, setAuthoringMode] = useState<AuthoringMode>(
    initial.allowRawHtml ? "raw" : "visual"
  );
  const allowRawHtml = authoringMode === "raw";
  // 每個模式各自的未儲存草稿快照，讓 session 內來回切換不遺失另一模式的編輯內容。
  const draftsRef = useRef<{ visual: string | null; raw: string | null }>({
    visual: initial.allowRawHtml ? null : initial.content,
    raw: initial.allowRawHtml ? initial.content : null,
  });
  const [pendingSwitchTarget, setPendingSwitchTarget] = useState<AuthoringMode | null>(null);
  // 樂觀鎖 token：載入時的 updatedAt，每次成功儲存後以伺服器回傳值更新，避免同一 session 連續儲存誤判衝突。
  const expectedUpdatedAtRef = useRef<string | null>(initial.updatedAt ?? null);
  const [showRawHtmlToc, setShowRawHtmlToc] = useState(initial.showRawHtmlToc ?? false);
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
  const [dirty, setDirty] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  // 表單快照：用來判斷自上次成功儲存以來是否有變更（dirty）
  function buildSnapshot() {
    return JSON.stringify({
      slug,
      title,
      excerpt,
      content,
      coverImage,
      readingTime,
      featured,
      allowRawHtml,
      showRawHtmlToc,
      status,
      publishedAt,
      categoryIds,
      tagIds,
      seoTitle,
      seoDescription,
      ogImage,
    });
  }
  const savedSnapshotRef = useRef(buildSnapshot());

  useEffect(() => {
    setDirty(buildSnapshot() !== savedSnapshotRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slug,
    title,
    excerpt,
    content,
    coverImage,
    readingTime,
    featured,
    authoringMode,
    showRawHtmlToc,
    status,
    publishedAt,
    categoryIds,
    tagIds,
    seoTitle,
    seoDescription,
    ogImage,
  ]);

  const canSubmit = useMemo(() => {
    return slug.trim() && title.trim() && excerpt.trim() && content.trim();
  }, [slug, title, excerpt, content]);

  const showRichHtmlWarning = useMemo(
    () => !allowRawHtml && detectStrippedRichHtml(content),
    [allowRawHtml, content]
  );

  // 實際套用模式切換：快照離開模式的內容，還原（或以目前內容初始化）目標模式草稿。
  // 切換本身不呼叫任何伺服器 sanitizer，只有儲存時才會 sanitize。
  function performSwitch(target: AuthoringMode) {
    draftsRef.current[authoringMode] = content;
    const nextDraft = draftsRef.current[target] ?? content;
    draftsRef.current[target] = nextDraft;
    setContent(nextDraft);
    setAuthoringMode(target);
  }

  // 模式切換的唯一入口：raw -> visual 且內容含區塊結構/inline 樣式時，先要求使用者確認
  // 才會不可逆地讓視覺 schema／下次儲存的 sanitizer 剝除該結構；visual -> raw 永不遺失，免確認。
  function switchMode(target: AuthoringMode) {
    if (target === authoringMode) return;
    if (authoringMode === "raw" && target === "visual" && detectStrippedRichHtml(content)) {
      setPendingSwitchTarget(target);
      return;
    }
    performSwitch(target);
  }

  function confirmPendingSwitch() {
    if (!pendingSwitchTarget) return;
    performSwitch(pendingSwitchTarget);
    setPendingSwitchTarget(null);
  }

  function cancelPendingSwitch() {
    setPendingSwitchTarget(null);
  }

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

  // 執行實際儲存（POST/PUT），成功時更新 dirty 快照；不處理導頁或預覽，交由呼叫端決定
  async function performSave(): Promise<boolean> {
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
          return false;
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
        showRawHtmlToc,
        status,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        categoryIds,
        tagIds,
        seoTitle: seoTitle.trim() ? seoTitle.trim() : null,
        seoDescription: seoDescription.trim() ? seoDescription.trim() : null,
        ogImage: ogImage.trim() ? ogImage.trim() : null,
        // edit 模式帶上樂觀鎖 token；create 模式為 null（後端視為未提供）。
        updatedAt: expectedUpdatedAtRef.current,
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
      // 以伺服器回傳的新 updatedAt 更新樂觀鎖 token，讓連續儲存不誤判衝突。
      const savedUpdatedAt = (json.data as { updatedAt?: string } | null)?.updatedAt;
      if (savedUpdatedAt) expectedUpdatedAtRef.current = savedUpdatedAt;
      savedSnapshotRef.current = buildSnapshot();
      setDirty(false);
      return true;
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "儲存失敗");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    const success = await performSave();
    if (success) {
      router.push("/admin/posts");
      router.refresh();
    }
  }

  function handlePreviewClick() {
    if (dirty) {
      setShowSavePrompt(true);
      return;
    }
    setPreviewOpen(true);
  }

  async function saveAndPreview() {
    const success = await performSave();
    if (success) {
      setShowSavePrompt(false);
      setPreviewOpen(true);
    }
  }

  function handleTitleChange(next: string) {
    setTitle(next);
    if (!initial.title && (!slug || slug === slugify(title))) setSlug(slugify(next));
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-4">
      <ActionBar
        title={mode === "create" ? "新增文章" : "編輯文章"}
        showPreviewButton={mode === "edit" && Boolean(slug.trim())}
        onPreviewClick={handlePreviewClick}
        message={message}
        saving={saving}
        canSubmit={Boolean(canSubmit)}
        onSubmit={submit}
      />

      {/* 未儲存變更時點擊預覽的提示 */}
      {showSavePrompt && (
        <div
          data-testid="save-first-prompt"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <p>表單有尚未儲存的變更，預覽只會顯示最近一次成功儲存的內容。</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" onClick={saveAndPreview} disabled={saving}>
              {saving ? "儲存中..." : "儲存並預覽"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowSavePrompt(false)}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* 表單 */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <AuthoringPanel
          title={title}
          onTitleChange={handleTitleChange}
          slug={slug}
          onSlugChange={setSlug}
          excerpt={excerpt}
          onExcerptChange={setExcerpt}
          authoringMode={authoringMode}
          onModeChange={switchMode}
          pendingSwitchTarget={pendingSwitchTarget}
          onConfirmPendingSwitch={confirmPendingSwitch}
          onCancelPendingSwitch={cancelPendingSwitch}
          content={content}
          onContentChange={setContent}
          allowRawHtml={allowRawHtml}
          showRawHtmlToc={showRawHtmlToc}
          onShowRawHtmlTocChange={setShowRawHtmlToc}
          showRichHtmlWarning={showRichHtmlWarning}
        />
        <SettingsPanel
          status={status}
          onStatusChange={setStatus}
          publishedAt={publishedAt}
          onPublishedAtChange={setPublishedAt}
          publishedAtPreview={formatPublishedAtPreview()}
          timeFormat={timeFormat}
          onTimeFormatChange={setTimeFormat}
          coverImage={coverImage}
          onCoverChange={setCoverImage}
          onCoverError={setMessage}
          readingTime={readingTime}
          onReadingTimeChange={setReadingTime}
          featured={featured}
          onFeaturedChange={setFeatured}
          categories={categories}
          categoryIds={categoryIds}
          onCategoryToggle={toggleCategory}
          tags={tags}
          tagIds={tagIds}
          onTagToggle={toggleTag}
          seoTitle={seoTitle}
          onSeoTitleChange={setSeoTitle}
          seoDescription={seoDescription}
          onSeoDescriptionChange={setSeoDescription}
          ogImage={ogImage}
          onOgImageChange={setOgImage}
        />
      </div>

      {/* 預覽 Modal */}
      {previewOpen && <PreviewModal slug={slug} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
