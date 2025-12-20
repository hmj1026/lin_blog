"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageCropperModal, cropImageToBlob } from "@/components/admin/image-cropper-modal";
import { Field } from "./field";
import { getImageDimensions } from "./utils";

type CoverUploaderProps = {
  coverImage: string;
  onCoverChange: (url: string) => void;
  onError: (message: string) => void;
};

export function CoverUploader({ coverImage, onCoverChange, onError }: CoverUploaderProps) {
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(null);
  const [cropUploading, setCropUploading] = useState(false);

  function cleanupSelectedCoverUrl() {
    if (selectedCoverUrl) URL.revokeObjectURL(selectedCoverUrl);
  }

  async function uploadCoverBlob(blob: Blob) {
    const form = new FormData();
    form.append("file", new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" }));
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const json = (await res.json()) as { success: boolean; data?: { src: string }; message?: string };
    if (!res.ok || !json.success || !json.data?.src) {
      throw new Error(json.message || "封面上傳失敗");
    }
    onCoverChange(json.data.src);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const { width, height } = await getImageDimensions(file);
      const tooSmall = width < 1200 || height < 630;
      if (tooSmall) {
        const ok = window.confirm(`封面建議尺寸至少 1200×630。\n你選的圖片：${width}×${height}\n仍要繼續裁切嗎？`);
        if (!ok) return;
      }

      if (selectedCoverUrl) URL.revokeObjectURL(selectedCoverUrl);
      const url = URL.createObjectURL(file);
      setSelectedCoverFile(file);
      setSelectedCoverUrl(url);
      setCropOpen(true);
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : "封面上傳失敗");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <Field label="封面圖片（上傳後會存為 /api/files/<id>）">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={uploadingCover || cropUploading}
            onClick={() => coverInputRef.current?.click()}
          >
            {uploadingCover ? "上傳中..." : "上傳封面"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!selectedCoverFile || cropUploading}
            onClick={() => setCropOpen(true)}
          >
            重新裁切
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!coverImage || uploadingCover}
            onClick={() => onCoverChange("")}
          >
            移除封面
          </Button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        {coverImage && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-base-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt="封面預覽" className="h-48 w-full object-cover" />
          </div>
        )}
      </Field>

      <ImageCropperModal
        open={cropOpen}
        imageUrl={selectedCoverUrl}
        onCancel={() => setCropOpen(false)}
        onConfirm={async ({ cropAreaPixels, outputWidth, outputHeight, mimeType }) => {
          if (!selectedCoverUrl) return;
          setCropUploading(true);
          try {
            const blob = await cropImageToBlob({
              imageSrc: selectedCoverUrl,
              cropAreaPixels,
              outputWidth,
              outputHeight,
              mimeType,
            });
            await uploadCoverBlob(blob);
            setCropOpen(false);
            cleanupSelectedCoverUrl();
          } catch (error: unknown) {
            onError(error instanceof Error ? error.message : "封面上傳失敗");
          } finally {
            setCropUploading(false);
          }
        }}
      />
    </>
  );
}
