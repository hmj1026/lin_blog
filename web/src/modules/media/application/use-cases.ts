import { randomUUID } from "crypto";
import path from "path";
import type { UploadRepository, StoragePort, ImageProcessorPort } from "./ports";
import type { UploadVisibility } from "../domain";

const MAX_LIST_TAKE = 200;

export type MediaUseCases = ReturnType<typeof createMediaUseCases>;

/**
 * 建立媒體模組的 Use Cases
 * 包含檔案上傳、串流讀取、列表查詢、軟刪除等邏輯
 *
 * @param deps - 依賴的 Repository 與 Ports
 */
export function createMediaUseCases(deps: {
  uploads: UploadRepository;
  storage: StoragePort;
  imageProcessor: ImageProcessorPort;
}) {
  return {
    /**
     * 查詢上傳檔案列表（支援檔名搜尋、類型篩選）
     */
    listUploads: async (params: { search?: string; type?: string; take?: number }) => {
      const take = Math.max(1, Math.min(params.take ?? 100, MAX_LIST_TAKE));
      return deps.uploads.list({ search: params.search, type: params.type, take });
    },

    /**
     * 建立新的上傳記錄
     */
    createUpload: (data: {
      originalName: string;
      storageKey: string;
      mimeType: string;
      size: number;
      visibility: UploadVisibility;
    }) => deps.uploads.create(data),

    /**
     * 根據 ID 取得上傳記錄
     */
    getUploadById: (id: string) => deps.uploads.getById(id),

    /**
     * 上傳檔案：圖片壓縮 → 副檔名/key 推導 → 寫入儲存 → 建立記錄。
     * 儲存失敗以離散結果回傳，讓上層決定 503（可重試）/ 500（不可重試）。
     */
    uploadFile: async (input: {
      buffer: Buffer;
      mimeType: string;
      originalName: string;
    }): Promise<
      | { ok: true; id: string; src: string }
      | { ok: false; error: "storage"; retryable: boolean; message: string }
    > => {
      const processed = await deps.imageProcessor.process(input.buffer, input.mimeType);
      const buffer = Buffer.from(processed.buffer);
      const mimeType = processed.mimeType;

      // 根據處理後的 mimeType 決定副檔名
      const extMap: Record<string, string> = {
        "image/webp": ".webp",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/avif": ".avif",
      };
      const ext = extMap[mimeType] || path.extname(input.originalName || "").toLowerCase() || ".bin";
      const safeExt = ext.length <= 10 ? ext : ".bin";
      const fileName = `${randomUUID()}${safeExt}`;
      const storageKey = `uploads/${fileName}`;

      const put = await deps.storage.putObject({ key: storageKey, contentType: mimeType, body: buffer });
      if (!put.ok) {
        return { ok: false, error: "storage", retryable: put.retryable, message: put.message };
      }

      const created = await deps.uploads.create({
        originalName: input.originalName || fileName,
        storageKey,
        mimeType,
        size: buffer.length,
        visibility: "PUBLIC",
      });

      return { ok: true, id: created.id, src: `/api/files/${created.id}` };
    },

    /**
     * 取得檔案串流（僅封裝儲存讀取）。存在/軟刪除/可見性檢查由呼叫端搭配讀取門面處理。
     * 儲存回報 NOT_FOUND 時回傳 { ok: false, reason: "not-found" }。
     */
    openFileStream: (storageKey: string) => deps.storage.getObjectStream({ key: storageKey }),

    /**
     * 軟刪除上傳記錄。若檔案不存在或已刪除，回傳 error: "not-found"
     */
    softDeleteUpload: async (id: string) => {
      const existing = await deps.uploads.getById(id);
      if (!existing || existing.deletedAt) return { ok: false as const, error: "not-found" as const };
      await deps.uploads.softDelete(id);
      return { ok: true as const };
    },
  };
}
