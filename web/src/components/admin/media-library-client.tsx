"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonStyles } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { Pagination } from "@/components/pagination";

type Upload = { id: string; originalName: string; mimeType: string; size: number; createdAt: string; src: string };
type Props = {
  initialUploads: Upload[];
  filters: { search: string; type: string };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
type MediaReference = { label: string };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 管理媒體的 URL 篩選、上傳、詳情、複製與安全刪除互動。 */
export function MediaLibraryClient({ initialUploads, filters, pagination }: Props) {
  const router = useRouter();
  const [uploads, setUploads] = useState(initialUploads);
  // initialUploads 由 Server Component 提供；上傳後 router.refresh() 或分頁 Link 導航都會帶入新的 props 參考，
  // 但 useState 僅初始化一次。以「render 期間比對前次 props」的官方模式同步，避免顯示過期或上一頁的媒體清單。
  const [prevInitialUploads, setPrevInitialUploads] = useState(initialUploads);
  if (initialUploads !== prevInitialUploads) {
    setPrevInitialUploads(initialUploads);
    setUploads(initialUploads);
  }
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Upload | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setFeedback(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "上傳失敗");
      setFeedback({ tone: "success", message: `已上傳「${file.name}」。` });
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "上傳失敗" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (upload: Upload) => {
    setDeleteTrigger(document.activeElement as HTMLElement | null);
    setDeleting(upload.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/uploads/${upload.id}`, { method: "GET" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "無法取得刪除影響");
      const references = json.data.references as MediaReference[];
      if (references.length > 0) {
        setFeedback({ tone: "error", message: `無法刪除，檔案仍被引用：${references.map((item) => item.label).join("、")}` });
        return;
      }
      setPendingDelete(upload);
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "無法取得刪除影響" });
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(pendingDelete.id);
    try {
      const response = await fetch(`/api/uploads/${pendingDelete.id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "刪除失敗");
      setUploads((current) => current.filter((item) => item.id !== pendingDelete.id));
      setFeedback({ tone: "success", message: `已刪除「${pendingDelete.originalName}」。` });
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "刪除失敗" });
    } finally {
      setDeleting(null);
    }
  };

  const queryParams = { ...(filters.search ? { q: filters.search } : {}), ...(filters.type ? { type: filters.type } : {}), pageSize: String(pagination.pageSize) };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-primary">媒體庫</h1>
        <label className={buttonStyles({ variant: "primary" })}>
          {uploading ? "上傳中…" : "上傳媒體"}
          <input
            type="file"
            aria-label="上傳媒體檔案"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4" aria-label="媒體篩選">
        <label className="grid gap-1 text-sm font-semibold text-primary">搜尋媒體檔案<input name="q" type="search" defaultValue={filters.search} placeholder="輸入檔案名稱" className="rounded-xl border border-line bg-white px-4 py-2 text-sm" /></label>
        <label className="grid gap-1 text-sm font-semibold text-primary">媒體類型<select name="type" defaultValue={filters.type} className="rounded-xl border border-line bg-white px-4 py-2 text-sm"><option value="">所有類型</option><option value="image/">圖片</option><option value="video/">影片</option><option value="application/pdf">PDF</option></select></label>
        <input type="hidden" name="pageSize" value={pagination.pageSize} />
        <Button type="submit">套用</Button>
        <Link href="/admin/media" className={buttonStyles({ variant: "ghost" })}>清除</Link>
      </form>

      {feedback ? <AdminFeedback tone={feedback.tone} message={feedback.message} /> : null}
      <p className="text-sm text-base-300">共 {pagination.total} 個檔案</p>
      {uploads.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-base-300">{filters.search || filters.type ? "找不到符合的檔案" : "目前沒有上傳的檔案"}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {uploads.map((upload) => (
            <article key={upload.id} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <div className="aspect-square bg-base-100">{upload.mimeType.startsWith("image/") ? <Image src={upload.src} alt={upload.originalName} width={200} height={200} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-4xl text-base-300">📄</div>}</div>
              <div className="p-3"><div className="truncate text-sm font-medium text-primary" title={upload.originalName}>{upload.originalName}</div><div className="mt-1 text-xs text-base-300">{formatSize(upload.size)}</div></div>
              <div role="group" aria-label={`${upload.originalName} 操作`} className="flex flex-wrap gap-2 border-t border-line p-3">
                <Button size="sm" variant="outline" aria-label="查看詳情" onClick={() => setDetailsId(detailsId === upload.id ? null : upload.id)}>詳情</Button>
                <Button size="sm" variant="secondary" aria-label="複製連結" onClick={async () => { await navigator.clipboard.writeText(upload.src); setFeedback({ tone: "success", message: `已複製「${upload.originalName}」的連結。` }); }}>複製連結</Button>
                <Button size="sm" variant="danger" aria-label="刪除" disabled={deleting === upload.id} onClick={() => handleDelete(upload)}>{deleting === upload.id ? "刪除中…" : "刪除"}</Button>
              </div>
              {detailsId === upload.id ? <section role="region" aria-label={`${upload.originalName} 詳情`} className="space-y-1 border-t border-line p-3 text-xs text-base-300"><p>MIME：{upload.mimeType}</p><p>大小：{formatSize(upload.size)}</p><p>上傳時間：{new Date(upload.createdAt).toLocaleString("zh-TW")}</p><p className="break-all">網址：{upload.src}</p></section> : null}
            </article>
          ))}
        </div>
      )}
      <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} baseUrl="/admin/media" queryParams={queryParams} />
      <ConfirmationDialog open={Boolean(pendingDelete)} title="確認刪除媒體" description={pendingDelete ? `確定刪除「${pendingDelete.originalName}」？已檢查結構化欄位、文章內文與 Raw HTML 引用候選。` : ""} confirmLabel="確認刪除" pending={Boolean(deleting)} returnFocus={deleteTrigger} onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
    </div>
  );
}
