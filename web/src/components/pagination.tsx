import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  queryParams?: Record<string, string>;
};

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  queryParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams(queryParams);
    params.set("page", String(page));
    return `${baseUrl}?${params.toString()}`;
  };

  // 計算要顯示的頁碼範圍
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const showPages = 5; // 最多顯示幾個頁碼

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 永遠顯示第一頁
      pages.push(1);

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      if (start > 2) pages.push("...");

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) pages.push("...");

      // 永遠顯示最後一頁
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav
      className="flex items-center justify-center gap-2"
      aria-label="分頁導覽"
    >
      {/* 上一頁 */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1) as never}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-primary transition hover:border-primary/40"
        >
          上一頁
        </Link>
      ) : (
        <span className="rounded-lg border border-line bg-base-50 px-3 py-2 text-sm font-medium text-base-300">
          上一頁
        </span>
      )}

      {/* 頁碼 */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) =>
          page === "..." ? (
            <span
              key={`dots-${index}`}
              className="px-2 text-base-300"
            >
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={buildUrl(page) as never}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                page === currentPage
                  ? "bg-primary text-white"
                  : "border border-line bg-white text-primary hover:border-primary/40"
              }`}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* 下一頁 */}
      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1) as never}
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-primary transition hover:border-primary/40"
        >
          下一頁
        </Link>
      ) : (
        <span className="rounded-lg border border-line bg-base-50 px-3 py-2 text-sm font-medium text-base-300">
          下一頁
        </span>
      )}
    </nav>
  );
}
