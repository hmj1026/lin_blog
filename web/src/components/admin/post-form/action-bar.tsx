"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type ActionBarProps = {
  title: string;
  showPreviewButton: boolean;
  onPreviewClick: () => void;
  message: string | null;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onBackClick?: () => void;
};

/**
 * 頂部固定操作列：返回連結、儲存/預覽狀態指示、預覽與儲存動作。
 * 捲動長文章時仍保持可見（sticky）。
 */
export function ActionBar({
  title,
  showPreviewButton,
  onPreviewClick,
  message,
  saving,
  canSubmit,
  onSubmit,
  onBackClick,
}: ActionBarProps) {
  return (
    <div
      data-testid="post-form-action-bar"
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-card backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl text-primary">{title}</h1>
        {showPreviewButton && (
          <Button type="button" size="sm" variant="secondary" onClick={onPreviewClick}>
            預覽
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div
          data-testid="post-form-status"
          role="status"
          aria-live="polite"
          className="text-sm text-base-300"
        >
          {message}
        </div>
        <Link
          href="/admin/posts"
          className="text-sm font-semibold text-accent-600"
          onClick={onBackClick ? (event) => { event.preventDefault(); onBackClick(); } : undefined}
        >
          返回列表
        </Link>
        <Button type="button" onClick={onSubmit} disabled={!canSubmit || saving}>
          {saving ? "儲存中..." : "儲存"}
        </Button>
      </div>
    </div>
  );
}
