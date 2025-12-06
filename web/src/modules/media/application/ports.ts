import type { UploadVisibility } from "../domain";

export type UploadRecord = {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  visibility: UploadVisibility;
  deletedAt: Date | null;
  createdAt: Date;
};

export interface UploadRepository {
  list(params: { search?: string; type?: string; take: number }): Promise<UploadRecord[]>;
  getById(id: string): Promise<UploadRecord | null>;
  create(data: {
    originalName: string;
    storageKey: string;
    mimeType: string;
    size: number;
    visibility: UploadVisibility;
  }): Promise<{ id: string }>;
  softDelete(id: string): Promise<{ id: string }>;
}

