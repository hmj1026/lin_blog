"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isApiSuccess, getApiErrorMessage } from "@/lib/api-client";
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
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";

type VersionDetail = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  allowRawHtml: boolean;
  showRawHtmlToc: boolean;
  editorName: string;
  createdAt: string;
};

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
  const persistedStatusRef = useRef<PostStatus>(initial.status);
  const lastAutoSaveCandidateRef = useRef<string | null>(null);
  // 意圖性整頁重載（版本還原成功／衝突重載）時設為 true，讓 beforeunload 警告放行。
  const bypassUnloadGuardRef = useRef(false);

  /** 使用者已明確同意放棄未儲存變更時的整頁重載：略過 beforeunload 攔截。 */
  function reloadDiscardingChanges() {
    bypassUnloadGuardRef.current = true;
    window.location.reload();
  }
  // 自動儲存失敗後遞增此 nonce 以強制重新觸發自動儲存 effect，讓相同內容得以重試。
  const [autoSaveRetryNonce, setAutoSaveRetryNonce] = useState(0);
  // 連續自動儲存失敗次數：僅暫時性失敗（網路中斷、5xx）重試，且達上限即暫停，避免無限重打 API。
  const autoSaveFailureCountRef = useRef(0);
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
  // 待確認的離開目標路徑：null 表示未顯示離開確認；由返回連結或站內導覽攔截設定。
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [validationSummary, setValidationSummary] = useState<string | null>(null);
  const [versions, setVersions] = useState<Array<{ id: string; title: string; editorName: string; createdAt: string }> | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionDetail, setVersionDetail] = useState<VersionDetail | null>(null);
  const [versionDetailLoading, setVersionDetailLoading] = useState<string | null>(null);
  const [pendingRestoreVersion, setPendingRestoreVersion] = useState<{ id: string; title: string } | null>(null);
  const [restoring, setRestoring] = useState(false);

  // 表單快照：用來判斷自上次成功儲存以來是否有變更（dirty）
  function buildSnapshot(statusOverride: PostStatus = status) {
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
      status: statusOverride,
      publishedAt,
      categoryIds,
      tagIds,
      seoTitle,
      seoDescription,
      ogImage,
    });
  }
  const savedSnapshotRef = useRef(buildSnapshot());
  // 永遠反映「最新一次 render 的表單快照」，讓儲存完成時能以請求期間可能產生的最新編輯重算 dirty，
  // 而非請求送出當下的舊快照（避免請求期間的新編輯被誤清 dirty 而遺失）。
  const latestSnapshotRef = useRef(buildSnapshot());

  useEffect(() => {
    latestSnapshotRef.current = buildSnapshot();
    setDirty(latestSnapshotRef.current !== savedSnapshotRef.current);
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

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // 使用者已在確認框同意放棄變更（版本還原／衝突重載）時，不再二次攔截。
      if (bypassUnloadGuardRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  // App Router 的 <Link> 站內導覽只做 client-side transition，不會觸發 beforeunload；
  // 以 capture 階段攔截同站錨點點擊，改走離開確認對話框，避免未儲存內容直接遺失。
  useEffect(() => {
    if (!dirty) return;
    function handleClickCapture(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (anchor.target === "_blank" || anchor.hasAttribute("download") || href.startsWith("#")) return;
      const url = new URL(anchor.href, window.location.href);
      // 跨站導覽會整頁卸載，由 beforeunload 警告涵蓋。
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveTarget(url.pathname + url.search + url.hash);
    }
    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [dirty]);

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
  async function performSave(kind: "manual" | "auto" = "manual"): Promise<boolean> {
    setSaving(true);
    setMessage(null);
    try {
      const error = validateBeforeSubmit();
      if (error) throw new Error(error);

      if (!allowRawHtml && detectStrippedRichHtml(content)) {
        // 自動儲存為背景流程，不得彈出阻塞式 window.confirm：偵測到會被剝除的區塊結構或
        // inline 樣式時，暫停自動儲存並提示使用者改用手動儲存或原始 HTML 模式。
        if (kind === "auto") {
          setMessage("偵測到會被剝除的區塊結構或 inline 樣式，已暫停自動儲存；請手動儲存或改用原始 HTML 模式。");
          return false;
        }
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
        status: kind === "auto" ? persistedStatusRef.current : status,
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
      if (!isApiSuccess(res, json)) {
        if (res.status === 409) setConflict(true);
        const saveError = new Error(getApiErrorMessage(json, "儲存失敗")) as Error & { status?: number };
        saveError.status = res.status;
        throw saveError;
      }
      // 以伺服器回傳的新 updatedAt 更新樂觀鎖 token，讓連續儲存不誤判衝突。
      const savedUpdatedAt = (json.data as { updatedAt?: string } | null)?.updatedAt;
      if (savedUpdatedAt) expectedUpdatedAtRef.current = savedUpdatedAt;
      persistedStatusRef.current = payload.status;
      autoSaveFailureCountRef.current = 0;
      // savedSnapshotRef 記錄「實際送出並儲存的快照」；dirty 則以最新快照（含請求期間的新編輯）重算，
      // 讓請求進行中產生的變更仍保持 dirty、續發自動儲存與離開警告，不會被舊快照誤清。
      savedSnapshotRef.current = buildSnapshot(kind === "auto" ? persistedStatusRef.current : status);
      setDirty(latestSnapshotRef.current !== savedSnapshotRef.current);
      const savedAt = new Date();
      setMessage(kind === "auto" ? `上次自動儲存：${savedAt.toLocaleTimeString("zh-TW")}` : "儲存成功");
      setValidationSummary(null);
      return true;
    } catch (error: unknown) {
      const baseMessage = error instanceof Error ? error.message : "儲存失敗";
      // 自動儲存僅對「暫時性」失敗（fetch 拋出的網路錯誤 status undefined、或 5xx）重試，
      // 且連續失敗達上限即暫停：4xx（如重複 slug）重送相同內容必然再失敗，不應無限重打 API；
      // 版本衝突（409）另由 conflict 旗標阻擋自動儲存，不會在此重試。
      if (kind === "auto") {
        const errorStatus = (error as { status?: number }).status;
        const transient = errorStatus === undefined || errorStatus >= 500;
        autoSaveFailureCountRef.current += 1;
        if (transient && autoSaveFailureCountRef.current < 3) {
          lastAutoSaveCandidateRef.current = null;
          setAutoSaveRetryNonce((nonce) => nonce + 1);
          setMessage(baseMessage);
        } else {
          setMessage(`${baseMessage}（自動儲存已暫停，請手動儲存）`);
        }
      } else {
        setMessage(baseMessage);
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (mode !== "edit" || !postId || !dirty || saving || conflict || persistedStatusRef.current !== "DRAFT") return;
    const candidate = buildSnapshot();
    if (candidate === lastAutoSaveCandidateRef.current || validateBeforeSubmit()) return;
    const timer = window.setTimeout(() => {
      lastAutoSaveCandidateRef.current = candidate;
      void performSave("auto");
    }, 1000);
    return () => window.clearTimeout(timer);
    // performSave/buildSnapshot intentionally use the current render snapshot.
    // autoSaveRetryNonce 讓失敗後（表單欄位未變、saving 因批次淨值不變）仍能重新觸發此 effect 排程重試。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, postId, dirty, saving, conflict, autoSaveRetryNonce, slug, title, excerpt, content, coverImage, readingTime, featured, authoringMode, showRawHtmlToc, status, publishedAt, categoryIds, tagIds, seoTitle, seoDescription, ogImage]);

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

  function handleStatusChange(next: PostStatus) {
    if (next === "PUBLISHED") {
      const error = validateBeforeSubmit();
      if (error) {
        setValidationSummary(`發布前請修正：${error}`);
        const fieldId = error.includes("slug") ? "post-slug" : error.includes("標題") ? "post-title" : error.includes("摘要") ? "post-excerpt" : null;
        if (fieldId) document.getElementById(fieldId)?.focus();
        return;
      }
    }
    setValidationSummary(null);
    setStatus(next);
  }

  async function toggleVersions() {
    if (versions !== null) {
      setVersions(null);
      return;
    }
    if (!postId) return;
    setVersionsLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}/versions`);
      const json = await parseJson<Array<{ id: string; title: string; editorName: string; createdAt: string }>>(response);
      if (!isApiSuccess(response, json)) throw new Error(getApiErrorMessage(json, "版本載入失敗"));
      setVersions(json.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "版本載入失敗");
    } finally {
      setVersionsLoading(false);
    }
  }

  /** 載入（或收合）指定版本的詳情，供管理員在還原前檢視內容與 Raw HTML/TOC 設定。 */
  async function viewVersion(versionId: string) {
    if (!postId) return;
    if (versionDetail?.id === versionId) {
      setVersionDetail(null);
      return;
    }
    setVersionDetailLoading(versionId);
    try {
      const response = await fetch(`/api/posts/${postId}/versions/${versionId}`);
      const json = await parseJson<VersionDetail>(response);
      if (!isApiSuccess(response, json)) throw new Error(getApiErrorMessage(json, "版本詳情載入失敗"));
      setVersionDetail(json.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "版本詳情載入失敗");
    } finally {
      setVersionDetailLoading(null);
    }
  }

  /** 還原到選定版本；成功後整頁重新載入以取得還原後內容與新的樂觀鎖 token。 */
  async function restoreVersion() {
    if (!postId || !pendingRestoreVersion) return;
    setRestoring(true);
    try {
      const response = await fetch(`/api/posts/${postId}/versions/${pendingRestoreVersion.id}`, { method: "POST" });
      const json = await parseJson<unknown>(response);
      if (!isApiSuccess(response, json)) throw new Error(getApiErrorMessage(json, "版本還原失敗"));
      reloadDiscardingChanges();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "版本還原失敗");
      setRestoring(false);
      setPendingRestoreVersion(null);
    }
  }

  const estimatedReadingMinutes = useMemo(() => {
    const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return Math.max(1, Math.ceil(plainText.length / 400));
  }, [content]);

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
        onBackClick={dirty ? () => setLeaveTarget("/admin/posts") : undefined}
      />

      {validationSummary ? <div role="alert" tabIndex={-1} className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{validationSummary}</div> : null}
      {conflict ? (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p>偵測到版本衝突；自動儲存已停止，請重新載入最新版本後比較本機內容。</p>
          <Button type="button" size="sm" className="mt-2" onClick={reloadDiscardingChanges}>重新載入最新版本</Button>
        </div>
      ) : null}
      {mode === "edit" ? (
        <div className="rounded-xl border border-line bg-white p-3">
          <Button type="button" size="sm" variant="secondary" onClick={toggleVersions} disabled={versionsLoading}>{versionsLoading ? "載入版本中..." : "版本歷史"}</Button>
          {versions ? (
            <ul className="mt-3 space-y-2 text-sm">
              {versions.map((version) => (
                <li key={version.id} className="rounded-lg border border-line p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{version.title}</strong>
                    <span className="text-base-300">{version.editorName} · {new Date(version.createdAt).toLocaleString("zh-TW")}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => viewVersion(version.id)} disabled={versionDetailLoading !== null}>
                      {versionDetail?.id === version.id ? "收合" : versionDetailLoading === version.id ? "載入中..." : "檢視"}
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setPendingRestoreVersion({ id: version.id, title: version.title })} disabled={restoring}>
                      還原
                    </Button>
                  </div>
                  {versionDetail?.id === version.id ? (
                    <div className="mt-2 space-y-1 text-xs text-base-300">
                      <p>Raw HTML：{versionDetail.allowRawHtml ? "啟用" : "停用"} · TOC：{versionDetail.showRawHtmlToc ? "顯示" : "隱藏"}</p>
                      <p className="text-primary">{versionDetail.excerpt}</p>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-base-100 p-2">{versionDetail.content}</pre>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

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
          onStatusChange={handleStatusChange}
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
          previewTitle={title}
          previewDescription={excerpt}
          estimatedReadingMinutes={estimatedReadingMinutes}
        />
      </div>

      {/* 預覽 Modal */}
      {previewOpen && <PreviewModal slug={slug} onClose={() => setPreviewOpen(false)} />}
      <ConfirmationDialog open={leaveTarget !== null} title="尚有未儲存變更" description="離開後可能遺失尚未安全保存的內容。" confirmLabel="仍要離開" onConfirm={() => { const target = leaveTarget; setLeaveTarget(null); if (target) router.push(target as Parameters<typeof router.push>[0]); }} onCancel={() => setLeaveTarget(null)} />
      <ConfirmationDialog open={Boolean(pendingRestoreVersion)} title="確認還原版本" description={pendingRestoreVersion ? `將文章還原為版本「${pendingRestoreVersion.title}」？目前未儲存的變更將會遺失。` : ""} confirmLabel="確認還原" pending={restoring} onConfirm={restoreVersion} onCancel={() => setPendingRestoreVersion(null)} />
    </div>
  );
}
