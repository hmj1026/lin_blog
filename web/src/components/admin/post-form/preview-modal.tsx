import { Button } from "@/components/ui/button";

type PreviewModalProps = {
  slug: string;
  onClose: () => void;
};

export function PreviewModal({ slug, onClose }: PreviewModalProps) {
  const previewUrl = `/blog/${encodeURIComponent(slug.trim())}?preview=1`;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4" onClick={onClose}>
      <div
        className="mx-auto h-[90vh] max-w-6xl overflow-hidden rounded-2xl border border-line bg-white shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="text-sm font-semibold text-primary">預覽：{slug}</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
            >
              新分頁
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>
              關閉
            </Button>
          </div>
        </div>
        <iframe title="post-preview" src={previewUrl} className="h-full w-full" />
      </div>
    </div>
  );
}
