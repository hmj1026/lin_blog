import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { randomUUID } from "crypto";
import path from "path";
import { NextRequest } from "next/server";
import { mediaUseCases } from "@/modules/media";
import { toUploadListItemDto } from "@/modules/media/presentation/dto";
import { getStorageAdapter, StorageError } from "@/modules/media/infrastructure/storage";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 單檔大小上限（bytes） */
const MAX_FILE_SIZE_BYTES = env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * GET /api/uploads - 列出所有上傳檔案
 */
export async function GET(request: NextRequest) {
  const authError = await requirePermission("uploads:write");
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";

  const uploads = await mediaUseCases.listUploads({ search, type, take: 100 });

  return jsonOk(uploads.map(toUploadListItemDto));
}

/**
 * POST /api/uploads - 上傳檔案
 */
export async function POST(request: Request) {
  const authError = await requirePermission("uploads:write");
  if (authError) return authError;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("缺少檔案", 400);
  }

  // 檔案大小驗證
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return jsonError(
      `檔案過大，上限為 ${env.UPLOAD_MAX_FILE_SIZE_MB}MB`,
      413
    );
  }

  const ext = path.extname(file.name || "").toLowerCase() || ".bin";
  const safeExt = ext.length <= 10 ? ext : ".bin";
  const fileName = `${randomUUID()}${safeExt}`;
  const storageKey = `uploads/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 使用 storage adapter 寫入
  const storage = getStorageAdapter();
  try {
    await storage.putObject({
      key: storageKey,
      contentType: file.type || "application/octet-stream",
      body: buffer,
    });
  } catch (error) {
    if (error instanceof StorageError) {
      const status = error.isRetryable ? 503 : 500;
      return jsonError(`儲存失敗：${error.message}`, status);
    }
    throw error;
  }

  const created = await mediaUseCases.createUpload({
    originalName: file.name || fileName,
    storageKey,
    mimeType: file.type || "application/octet-stream",
    size: buffer.length,
    visibility: "PUBLIC",
  });

  return jsonOk({ id: created.id, src: `/api/files/${created.id}` });
}

