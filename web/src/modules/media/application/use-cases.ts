import type { UploadRepository } from "./ports";
import type { UploadVisibility } from "../domain";

const MAX_LIST_TAKE = 200;

export type MediaUseCases = ReturnType<typeof createMediaUseCases>;

/**
 * 建立媒體模組的 Use Cases
 * 包含檔案上傳、列表查詢、軟刪除等邏輯
 * 
 * @param deps - 依賴的 Repositories
 */
export function createMediaUseCases(deps: { uploads: UploadRepository }) {
  return {
    /**
     * 查詢上傳檔案列表
     * 支援檔案名稱搜尋、類型篩選
     * 
     * @param params - 查詢參數 (search, type, take)
     */
    listUploads: async (params: { search?: string; type?: string; take?: number }) => {
      const take = Math.max(1, Math.min(params.take ?? 100, MAX_LIST_TAKE));
      return deps.uploads.list({ search: params.search, type: params.type, take });
    },

    /**
     * 建立新的上傳記錄
     * 
     * @param data - 檔案中繼資料 (originalName, storageKey, mimeType, size 等)
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
     * 軟刪除上傳記錄
     * 若檔案不存在或已刪除，回傳 error: "not-found"
     */
    softDeleteUpload: async (id: string) => {
      const existing = await deps.uploads.getById(id);
      if (!existing || existing.deletedAt) return { ok: false as const, error: "not-found" as const };
      await deps.uploads.softDelete(id);
      return { ok: true as const };
    },
  };
}

