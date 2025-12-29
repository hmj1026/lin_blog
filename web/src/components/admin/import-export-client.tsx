"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ImportExportClient() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importMode, setImportMode] = useState<"skip" | "overwrite">("skip");
  const [result, setResult] = useState<string | null>(null);

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
      a.download = format === "json" ? "posts-export.json" : "posts-export.md";
      a.click();
      URL.revokeObjectURL(url);
      setResult("匯出成功！");
    } catch {
      setResult("匯出失敗");
    } finally {
      setExporting(false);
    }
  };

  // 匯入
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);
    try {
      const text = await file.text();
      const posts = JSON.parse(text);

      const res = await fetch("/api/posts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: Array.isArray(posts) ? posts : [posts], mode: importMode }),
      });

      const json = await res.json();
      if (json.success) {
        setResult(json.data.message);
        router.refresh();
      } else {
        setResult(json.message || "匯入失敗");
      }
    } catch {
      setResult("匯入失敗：無效的 JSON 格式");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-primary">匯入 / 匯出</h1>

      {/* 匯出區塊 */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="mb-4 font-semibold text-primary">匯出文章</h2>
        <p className="mb-4 text-sm text-base-300">將所有文章匯出為備份檔案。</p>
        <div className="flex gap-3">
          <Button
            onClick={() => handleExport("json")}
            disabled={exporting}
            variant="primary"
          >
            {exporting ? "匯出中..." : "匯出為 JSON"}
          </Button>
          <Button
            onClick={() => handleExport("markdown")}
            disabled={exporting}
            variant="outline"
          >
            匯出為 Markdown
          </Button>
        </div>
      </div>

      {/* 匯入區塊 */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="mb-4 font-semibold text-primary">匯入文章</h2>
        <p className="mb-4 text-sm text-base-300">從 JSON 檔案匯入文章。</p>

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
          {importing ? "匯入中..." : "選擇 JSON 檔案"}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      {/* 結果訊息 */}
      {result && (
        <div className="rounded-xl bg-base-100 p-4 text-sm text-primary">{result}</div>
      )}
    </div>
  );
}
