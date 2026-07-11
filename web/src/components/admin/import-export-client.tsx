"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { parseMarkdown, unpackZip, type ArchivePost } from "@/lib/posts/markdown-archive";

// 依副檔名把上傳檔解析成待匯入文章陣列（.zip / .md / .json 皆可）。
async function parseImportFile(file: File): Promise<ArchivePost[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) {
    return unpackZip(await file.arrayBuffer());
  }
  if (name.endsWith(".md") || name.endsWith(".markdown")) {
    return [parseMarkdown(await file.text())];
  }
  const json = JSON.parse(await file.text());
  return Array.isArray(json) ? json : [json];
}

export function ImportExportClient() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importMode, setImportMode] = useState<"skip" | "overwrite">("skip");
  const [result, setResult] = useState<string | null>(null);
  // 匯入前預覽：解析後的文章與來源檔名，使用者確認後才實際寫入。
  const [preview, setPreview] = useState<{ fileName: string; posts: ArchivePost[] } | null>(null);

  // 匯出
  const handleExport = async (format: "json" | "markdown") => {
    setExporting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/posts/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "posts-export.json" : "posts-export.zip";
      a.click();
      URL.revokeObjectURL(url);
      setResult("匯出成功！");
    } catch {
      setResult("匯出失敗");
    } finally {
      setExporting(false);
    }
  };

  // 選檔：解析並顯示預覽（尚未寫入）
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setPreview(null);
    try {
      const posts = await parseImportFile(file);
      if (posts.length === 0) {
        setResult("匯入失敗：檔案沒有任何文章");
        return;
      }
      setPreview({ fileName: file.name, posts });
    } catch {
      setResult("匯入失敗：無法解析檔案（僅支援 .json / .md / .zip）");
    } finally {
      e.target.value = "";
    }
  };

  // 確認匯入：實際 POST 寫入
  const confirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/posts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: preview.posts, mode: importMode }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data.message);
        setPreview(null);
        router.refresh();
      } else {
        setResult(json.message || "匯入失敗");
      }
    } catch {
      setResult("匯入失敗");
    } finally {
      setImporting(false);
    }
  };

  const cancelImport = () => {
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-primary">匯入 / 匯出</h1>

      {/* 匯出區塊 */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="mb-4 font-semibold text-primary">匯出文章</h2>
        <p className="mb-4 text-sm text-base-300">將所有文章匯出為備份檔案（Markdown 匯出為可再匯入的 ZIP）。</p>
        <div className="flex gap-3">
          <Button onClick={() => handleExport("json")} disabled={exporting} variant="primary">
            {exporting ? "匯出中..." : "匯出為 JSON"}
          </Button>
          <Button onClick={() => handleExport("markdown")} disabled={exporting} variant="outline">
            匯出為 Markdown (ZIP)
          </Button>
        </div>
      </div>

      {/* 匯入區塊 */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="mb-4 font-semibold text-primary">匯入文章</h2>
        <p className="mb-4 text-sm text-base-300">從 JSON、Markdown 或 ZIP 檔案匯入文章。</p>

        <div className="mb-4 flex items-center gap-4">
          <span className="text-sm text-primary">重複處理：</span>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={importMode === "skip"}
              onChange={() => setImportMode("skip")}
              className="accent-primary"
            />
            <span className="text-sm text-primary">略過</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={importMode === "overwrite"}
              onChange={() => setImportMode("overwrite")}
              className="accent-primary"
            />
            <span className="text-sm text-primary">覆蓋</span>
          </label>
        </div>

        <label className="inline-block cursor-pointer rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-primary shadow-card">
          選擇檔案（.json / .md / .zip）
          <input
            type="file"
            accept=".json,.md,.markdown,.zip"
            onChange={handleFileSelected}
            disabled={importing}
            className="hidden"
          />
        </label>

        {/* 匯入預覽 */}
        {preview && (
          <div className="mt-6 rounded-2xl border border-line bg-base-50 p-4" data-testid="import-preview">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-primary">
                匯入預覽：{preview.fileName}（{preview.posts.length} 篇）
              </h3>
              <span className="text-xs text-base-300">模式：{importMode === "skip" ? "略過重複" : "覆蓋重複"}</span>
            </div>
            <ul className="divide-y divide-line">
              {preview.posts.map((p, i) => (
                <li key={`${p.slug}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                  <span className="font-medium text-primary">{p.title || "(無標題)"}</span>
                  <span className="text-base-300">/{p.slug || "(無 slug)"}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-primary">
                    模式：{p.allowRawHtml ? "原始 HTML" : "一般"}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-primary">
                    目錄：{p.showRawHtmlToc ? "開啟" : "關閉"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-3">
              <Button onClick={confirmImport} disabled={importing} variant="primary">
                {importing ? "匯入中..." : "確認匯入"}
              </Button>
              <Button onClick={cancelImport} disabled={importing} variant="outline">
                取消
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 結果訊息 */}
      {result && <div className="rounded-xl bg-base-100 p-4 text-sm text-primary">{result}</div>}
    </div>
  );
}
