import Link from "next/link";

type DaysFilterProps = {
  /** 基礎 URL，例如 "/admin/analytics/posts" */
  baseUrl: string;
  /** 當前選中的天數 */
  currentDays: number;
  /** 可選的天數選項，預設 [7, 30, 90] */
  options?: number[];
  /** 額外的 URL 參數 */
  extraParams?: Record<string, string>;
};

/**
 * 天數篩選器組件
 * 用於 Analytics 等需要時間範圍篩選的頁面
 */
export function DaysFilter({
  baseUrl,
  currentDays,
  options = [7, 30, 90],
  extraParams,
}: DaysFilterProps) {
  const buildUrl = (days: number) => {
    const params = new URLSearchParams(extraParams);
    params.set("days", String(days));
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      {options.map((days) => (
        <Link
          key={days}
          href={buildUrl(days) as never}
          className={`rounded-full border px-4 py-2 transition-colors ${
            currentDays === days
              ? "border-primary bg-primary text-white"
              : "border-line bg-white text-primary hover:border-primary/40"
          }`}
        >
          {days} 天
        </Link>
      ))}
    </div>
  );
}
