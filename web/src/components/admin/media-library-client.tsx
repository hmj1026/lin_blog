"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type Upload = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  src: string;
};

export function MediaLibraryClient() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/uploads")
      .then((response) => response.json())
      .then((json) => {
        if (!ignore && json.success) setUploads(json.data);
      })
      .catch(() => console.error("Failed to fetch uploads"))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // 過濾
  const filteredUploads = useMemo(() => {
    return uploads.filter((u) => {
      const matchSearch = !search || u.originalName.toLowerCase().includes(search.toLowerCase());
      const matchType = !typeFilter || u.mimeType.startsWith(typeFilter);
      return matchSearch && matchType;
    });
  }, [uploads, search, typeFilter]);

  // 刪除
  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此檔案嗎？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/uploads/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setUploads((prev) => prev.filter((u) => u.id !== id));
      } else {
        alert(json.message || "刪除失敗");
      }
    } catch {
      alert("刪除失敗");
    } finally {
      setDeleting(null);
    }
  };

  // 格式化檔案大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // 判斷是否為圖片
  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <div className="space-y-6">
      {/* 標題與工具列 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-primary">媒體庫</h1>
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋檔案名稱..."
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm text-primary placeholder:text-base-300 focus:border-primary focus:outline-none"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm text-primary focus:border-primary focus:outline-none"
          >
            <option value="">所有類型</option>
            <option value="image/">圖片</option>
            <option value="video/">影片</option>
            <option value="application/pdf">PDF</option>
          </select>
        </div>
      </div>

      {/* 內容 */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-base-300">載入中...</div>
      ) : filteredUploads.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-base-300">
          {search || typeFilter ? "找不到符合的檔案" : "目前沒有上傳的檔案"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredUploads.map((upload) => (
            <div
              key={upload.id}
              className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:shadow-lg"
            >
              {/* 縮圖 */}
              <div className="aspect-square bg-base-100">
                {isImage(upload.mimeType) ? (
                  <Image
                    src={upload.src}
                    alt={upload.originalName}
                    width={200}
                    height={200}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl text-base-300">
                    📄
                  </div>
                )}
              </div>

              {/* 資訊 */}
              <div className="p-3">
                <div className="truncate text-sm font-medium text-primary" title={upload.originalName}>
                  {upload.originalName}
                </div>
                <div className="mt-1 text-xs text-base-300">
                  {formatSize(upload.size)}
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition group-hover:opacity-100">
                <Button
                  onClick={() => navigator.clipboard.writeText(upload.src)}
                  variant="secondary"
                  size="sm"
                >
                  複製連結
                </Button>
                <Button
                  onClick={() => handleDelete(upload.id)}
                  disabled={deleting === upload.id}
                  variant="danger"
                  size="sm"
                >
                  {deleting === upload.id ? "刪除中..." : "刪除"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
