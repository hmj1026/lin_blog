import type { UploadRepository } from "./ports";
import type { UploadVisibility } from "../domain";

const MAX_LIST_TAKE = 200;

export type MediaUseCases = ReturnType<typeof createMediaUseCases>;

export function createMediaUseCases(deps: { uploads: UploadRepository }) {
  return {
    listUploads: async (params: { search?: string; type?: string; take?: number }) => {
      const take = Math.max(1, Math.min(params.take ?? 100, MAX_LIST_TAKE));
      return deps.uploads.list({ search: params.search, type: params.type, take });
    },

    createUpload: (data: {
      originalName: string;
      storageKey: string;
      mimeType: string;
      size: number;
      visibility: UploadVisibility;
    }) => deps.uploads.create(data),

    getUploadById: (id: string) => deps.uploads.getById(id),

    softDeleteUpload: async (id: string) => {
      const existing = await deps.uploads.getById(id);
      if (!existing || existing.deletedAt) return { ok: false as const, error: "not-found" as const };
      await deps.uploads.softDelete(id);
      return { ok: true as const };
    },
  };
}

