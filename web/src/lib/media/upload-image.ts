import type { UploadResult } from "@/lib/media/media-insert";

type UploadApiResponse = {
  success: boolean;
  data?: { src: string };
  message?: string;
};

/**
 * Single source of truth for the `/api/uploads` call. Uploads a blob and
 * returns its relative URL. Throws on any failure so callers never mutate
 * editor content on a failed upload.
 */
export async function uploadImageBlob(blob: Blob, fileName: string): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", new File([blob], fileName, { type: blob.type || "image/jpeg" }));

  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const json = (await res.json()) as UploadApiResponse;

  if (!res.ok || !json.success || !json.data?.src) {
    throw new Error(json.message || "上傳失敗");
  }

  return { src: json.data.src };
}
