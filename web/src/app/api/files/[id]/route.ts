import { NextResponse } from "next/server";
import { Readable } from "stream";
import { mediaUseCases } from "@/modules/media";
import { getStorageAdapter, StorageError } from "@/modules/media/infrastructure/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Context) {
  const { id } = await context.params;
  const upload = await mediaUseCases.getUploadById(id);
  if (!upload || upload.deletedAt) {
    return NextResponse.json(
      { success: false, message: "找不到檔案", data: null },
      { status: 404 }
    );
  }
  if (upload.visibility !== "PUBLIC") {
    return NextResponse.json(
      { success: false, message: "禁止存取", data: null },
      { status: 403 }
    );
  }

  const storage = getStorageAdapter();
  try {
    const result = await storage.getObjectStream({ key: upload.storageKey });

    // 將 Node.js Readable 轉為 Web ReadableStream
    let webStream: ReadableStream;
    if (result.stream instanceof Readable) {
      webStream = Readable.toWeb(result.stream) as unknown as ReadableStream;
    } else {
      webStream = result.stream;
    }

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": result.contentType || upload.mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(result.contentLength ? { "Content-Length": String(result.contentLength) } : {}),
      },
    });
  } catch (error) {
    if (error instanceof StorageError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "找不到檔案", data: null },
        { status: 404 }
      );
    }
    throw error;
  }
}

