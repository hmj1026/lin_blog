import type { ApiResponse } from "./types";

export function slugify(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function parseJson<T>(res: Response): Promise<ApiResponse<T>> {
  const json = (await res.json()) as ApiResponse<T>;
  return json;
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(date: Date, timeFormat: "24h" | "12h"): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hours = date.getHours();
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  if (timeFormat === "12h") {
    const ampm = hours >= 12 ? "PM" : "AM";
    const hh12 = hours % 12 || 12;
    return `${yyyy}-${mm}-${dd} ${pad2(hh12)}:${mi}:${ss} ${ampm}`;
  }
  return `${yyyy}-${mm}-${dd} ${pad2(hours)}:${mi}:${ss}`;
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("圖片讀取失敗"));
      img.src = url;
    });
    return { width: img.width, height: img.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
