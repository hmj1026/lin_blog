"use client";

import Cropper from "react-easy-crop";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Area = { x: number; y: number; width: number; height: number };

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("圖片讀取失敗"));
    img.src = src;
  });
  return img;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function cropImageToBlob(params: {
  imageSrc: string;
  cropAreaPixels: Area;
  outputWidth: number;
  outputHeight: number;
  mimeType?: string;
  quality?: number;
}) {
  const image = await loadImage(params.imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = params.outputWidth;
  canvas.height = params.outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 初始化失敗");

  const { x, y, width, height } = params.cropAreaPixels;

  ctx.drawImage(
    image,
    x,
    y,
    width,
    height,
    0,
    0,
    params.outputWidth,
    params.outputHeight
  );

  const mime = params.mimeType ?? "image/jpeg";
  const quality = params.quality ?? 0.92;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), mime, quality)
  );
  if (!blob) throw new Error("圖片輸出失敗");
  return blob;
}

export function ImageCropperModal({
  open,
  imageUrl,
  initialAspect = 1200 / 630,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  imageUrl: string | null;
  initialAspect?: number;
  onCancel: () => void;
  onConfirm: (result: { cropAreaPixels: Area; outputWidth: number; outputHeight: number; mimeType: string }) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number>(initialAspect);
  const [area, setArea] = useState<Area | null>(null);

  const preset = useMemo(
    () => [
      { label: "封面 1200×630", aspect: 1200 / 630, w: 1200, h: 630 },
      { label: "16:9", aspect: 16 / 9, w: 1280, h: 720 },
      { label: "1:1", aspect: 1, w: 1080, h: 1080 },
      { label: "自由", aspect: 0, w: 1200, h: 630 },
    ],
    []
  );

  if (!open || !imageUrl) return null;

  const selected = preset.find((p) => (aspect === 0 ? p.aspect === 0 : Math.abs(p.aspect - aspect) < 0.0001)) ?? preset[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4" onClick={onCancel}>
      <div
        className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-line bg-white shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="text-sm font-semibold text-primary">裁切封面</div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!area) return;
                onConfirm({
                  cropAreaPixels: area,
                  outputWidth: selected.w,
                  outputHeight: selected.h,
                  mimeType: "image/jpeg",
                });
              }}
              disabled={!area}
            >
              套用並上傳
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-base-50">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect === 0 ? undefined : aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_cropped, croppedAreaPixels) => setArea(croppedAreaPixels as Area)}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-base-50 p-4">
              <div className="text-sm font-semibold text-primary">比例</div>
              <div className="mt-3 grid gap-2">
                {preset.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                      (aspect === 0 && p.aspect === 0) || Math.abs(p.aspect - aspect) < 0.0001
                        ? "border-primary bg-white text-primary shadow-card"
                        : "border-line bg-white text-primary hover:border-primary/40"
                    }`}
                    onClick={() => setAspect(p.aspect)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-xs text-base-300">可縮放與拖曳裁切框，套用後仍可重新上傳微調。</div>
            </div>

            <div className="rounded-2xl border border-line bg-base-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-primary">縮放</div>
                <div className="text-xs text-base-300">{zoom.toFixed(2)}x</div>
              </div>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(clamp(Number(e.target.value), 0.5, 3))}
                className="mt-3 w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

