"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageCropperModal, cropImageToBlob } from "@/components/admin/image-cropper-modal";
import { uploadImageBlob } from "@/lib/media/upload-image";
import { buildImageHtml, insertTextAtSelection, type UploadResult } from "@/lib/media/media-insert";

type RawHtmlFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Accessible media control for the raw-HTML authoring mode. Reuses the same
 * SSOT upload/crop/insert helpers as the TipTap (visual) editor — no second
 * `/api/uploads` call site and no duplicated crop flow.
 */
export function RawHtmlField({ value, onChange }: RawHtmlFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [alt, setAlt] = useState("");

  function cleanupSelectedImage() {
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    setSelectedImageUrl(null);
    setSelectedFileName("");
  }

  function handleFileSelect(file: File) {
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    const url = URL.createObjectURL(file);
    setSelectedImageUrl(url);
    setSelectedFileName(file.name);
    setCropOpen(true);
    setUploadError(null);
  }

  async function handleCropConfirm({
    cropAreaPixels,
    outputWidth,
    outputHeight,
    mimeType,
  }: {
    cropAreaPixels: { x: number; y: number; width: number; height: number };
    outputWidth: number;
    outputHeight: number;
    mimeType: string;
  }) {
    if (!selectedImageUrl) return;
    setUploading(true);
    setUploadError(null);
    try {
      const blob = await cropImageToBlob({
        imageSrc: selectedImageUrl,
        cropAreaPixels,
        outputWidth,
        outputHeight,
        mimeType,
      });
      const uploaded = await uploadImageBlob(blob, selectedFileName);
      setResult(uploaded);
      setAlt("");
      setCropOpen(false);
      cleanupSelectedImage();
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : "上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  function handleInsertAtCursor() {
    if (!result) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const fragment = buildImageHtml(result, alt);
    const next = insertTextAtSelection(value, start, end, fragment);
    onChange(next.value);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  async function copyToClipboard(text: string) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setCopyError("複製失敗，請手動複製。");
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        ref={textareaRef}
        id="raw-html-editor"
        data-testid="raw-html-editor"
        aria-label="原始 HTML 內容"
        className="min-h-[360px] w-full rounded-2xl border border-line bg-white p-4 font-mono text-sm text-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="直接輸入 HTML（可含 <style>）；儲存時仍會移除 <script>、事件屬性與危險 CSS。"
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-base-50 p-3">
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? "上傳中..." : "插入圖片"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            handleFileSelect(file);
            e.target.value = "";
          }}
        />

        {uploadError && (
          <p role="alert" className="text-xs text-red-600">
            {uploadError}
          </p>
        )}

        {result && (
          <div className="flex w-full flex-wrap items-center gap-3">
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.src} alt="插入圖片預覽" className="h-16 w-24 object-cover" />
            </div>

            <label className="flex items-center gap-2 text-sm text-primary">
              替代文字（alt）
              <input
                type="text"
                className="rounded-lg border border-line bg-white px-2 py-1 text-sm"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
              />
            </label>

            <Button type="button" variant="secondary" onClick={handleInsertAtCursor}>
              插入到游標
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => copyToClipboard(result.src)}
            >
              複製圖片網址
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => copyToClipboard(buildImageHtml(result, alt))}
            >
              複製 &lt;img&gt; 標籤
            </Button>

            {copyError && (
              <p role="alert" className="w-full text-xs text-red-600">
                {copyError}
              </p>
            )}
          </div>
        )}
      </div>

      <ImageCropperModal
        open={cropOpen}
        imageUrl={selectedImageUrl}
        initialAspect={16 / 9}
        onCancel={() => {
          setCropOpen(false);
          cleanupSelectedImage();
        }}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
