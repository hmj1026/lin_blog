import type { UploadRecord } from "../application/ports";

export type UploadListItemDto = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  src: string;
};

export function toUploadListItemDto(record: UploadRecord): UploadListItemDto {
  return {
    id: record.id,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
    createdAt: record.createdAt.toISOString(),
    src: `/api/files/${record.id}`,
  };
}

