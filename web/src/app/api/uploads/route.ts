import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { NextRequest } from "next/server";
import { mediaUseCases } from "@/modules/media";
import { toUploadListItemDto } from "@/modules/media/presentation/dto";
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
  const result = await mediaUseCases.listUploadsPage({
    search: searchParams.get("q") ?? searchParams.get("search") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 20),
  });

  return jsonOk({ ...result, items: result.items.map(toUploadListItemDto) });
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

  // 檔案大小驗證（必須在讀取 arrayBuffer 前，避免將過大檔案讀入記憶體）
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return jsonError(`檔案過大，上限為 ${env.UPLOAD_MAX_FILE_SIZE_MB}MB`, 413);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = file.type || "application/octet-stream";

  const result = await mediaUseCases.uploadFile({ buffer, mimeType, originalName: file.name });
  if (!result.ok) {
    const status = result.retryable ? 503 : 500;
    return jsonError(`儲存失敗：${result.message}`, status);
  }

  return jsonOk({ id: result.id, src: result.src });
}
