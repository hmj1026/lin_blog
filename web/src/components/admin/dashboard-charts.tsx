"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminFeedback } from "@/components/admin/admin-feedback";

type TrendData = { date: string; count: number }[];
type TopPost = { postId: string; slug: string; title: string; count: number };
type StatItem = { name: string; count: number };
type DeviceData = { type: string; count: number };

type DashboardData = {
  trend: TrendData;
  topPosts: TopPost[];
  devices: DeviceData[];
  browsers: StatItem[];
  os: StatItem[];
  sources: Array<{ source: string; name: string; count: number }>;
  comparison: { current: number; previous: number; percentChange: number | null };
  period: { days: number; timeZone: string };
};

export function DashboardCharts() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"device" | "browser" | "os">("device");
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/analytics/stats?days=${days}`)
      .then((response) => response.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message || "無法載入分析資料");
        if (!ignore) setData(json.data);
      })
      .catch(() => {
        if (!ignore) setError("無法載入分析資料，請稍後再試。");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [days, retryKey]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-base-300">載入中...</div>;
  }
  if (error) {
    return (
      <AdminFeedback
        tone="error"
        message={error}
        retryLabel="重新載入"
        onRetry={() => {
          setLoading(true);
          setError(null);
          setRetryKey((value) => value + 1);
        }}
      />
    );
  }
  if (!data) return <AdminFeedback tone="info" message="目前沒有分析資料。" />;

  const maxCount = Math.max(...data.trend.map((t) => t.count), 1);

  const getStatItems = () => {
    switch (activeTab) {
      case "browser":
        return data.browsers;
      case "os":
        return data.os;
      case "device":
      default:
        return data.devices.map((d) => ({ name: d.type, count: d.count }));
    }
  };

  const statItems = getStatItems();
  const comparisonText = data.comparison.percentChange === null
    ? "較前期為新增流量"
    : `較前期 ${data.comparison.percentChange >= 0 ? "+" : ""}${data.comparison.percentChange}%`;

  return (
    <div className="space-y-6">
      {/* 時間範圍選擇 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-base-300">時間範圍：</span>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => {
              if (d === days) return;
              setLoading(true);
              setError(null);
              setDays(d);
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              days === d ? "bg-primary text-white" : "bg-base-100 text-primary hover:bg-base-200"
            }`}
          >
            {d} 天
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="text-sm text-base-300">本期瀏覽</div>
          <div className="mt-1 text-3xl font-semibold text-primary">{data.comparison.current}</div>
          <div className="mt-1 text-sm text-base-300">{comparisonText}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="text-sm text-base-300">前期瀏覽</div>
          <div className="mt-1 text-3xl font-semibold text-primary">{data.comparison.previous}</div>
          <div className="mt-1 text-sm text-base-300">Asia/Taipei・{data.period.days} 天</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 趨勢圖 */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-semibold text-primary">瀏覽趨勢</h2>
          <div className="flex h-48 gap-2">
            <div className="flex flex-col justify-between text-xs text-base-300 py-1 text-right min-w-[30px]">
              <span>{maxCount}</span>
              <span>{Math.round(maxCount / 2)}</span>
              <span>0</span>
            </div>
            <div className="flex flex-1 items-end gap-1 border-l border-b border-line pl-2 pb-2">
              {data.trend.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-1 py-0.5 whitespace-nowrap z-10">
                    {t.count} 次
                  </div>
                  <div
                    className="w-full rounded-t bg-accent-500 transition-all group-hover:bg-accent-600"
                    style={{ height: `${(t.count / maxCount) * 100}%`, minHeight: t.count > 0 ? "4px" : "0" }}
                  />
                  <span className="text-[10px] text-base-300 truncate w-full text-center">
                    {new Date(t.date).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <table className="sr-only">
            <caption>每日瀏覽文字資料</caption>
            <thead><tr><th>日期</th><th>瀏覽數</th></tr></thead>
            <tbody>
              {data.trend.map((row) => <tr key={row.date}><td>{row.date}</td><td>{row.count}</td></tr>)}
            </tbody>
          </table>
        </div>

        {/* 熱門文章 */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-semibold text-primary">熱門文章</h2>
          {data.topPosts.length === 0 ? (
            <div className="text-sm text-base-300">暫無數據</div>
          ) : (
            <ol className="space-y-2">
              {data.topPosts.slice(0, 5).map((p, i) => (
                <li key={p.postId} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-500/10 text-xs font-bold text-accent-600">
                    {i + 1}
                  </span>
                  <Link 
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    className="flex-1 truncate text-sm text-primary hover:underline hover:text-accent-600 transition-colors"
                  >
                    {p.title}
                  </Link>
                  <span className="text-sm font-medium text-base-300">{p.count} 次</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* 訪客分析 (裝置/瀏覽器/系統) */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-primary">訪客分析</h2>
            <div className="flex gap-1 rounded-lg bg-base-100 p-1">
              {(["device", "browser", "os"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    activeTab === tab ? "bg-white text-primary shadow-sm" : "text-base-300 hover:text-primary"
                  }`}
                >
                  {tab === "device" ? "裝置" : tab === "browser" ? "瀏覽器" : "系統"}
                </button>
              ))}
            </div>
          </div>

          {statItems.length === 0 ? (
            <div className="text-sm text-base-300">暫無數據</div>
          ) : (
            <div className="space-y-3">
              {statItems.map((d) => {
                const total = statItems.reduce((sum, x) => sum + x.count, 0);
                const percent = total > 0 ? Math.round((d.count / total) * 100) : 0;
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary">{d.name}</span>
                      <span className="text-base-300">{d.count} ({percent}%)</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-base-100">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 font-semibold text-primary">流量來源</h2>
          {data.sources.length === 0 ? (
            <div className="text-sm text-base-300">暫無數據</div>
          ) : (
            <ul className="space-y-3">
              {data.sources.map((source) => (
                <li key={source.source} className="flex items-center justify-between text-sm">
                  <span className="text-primary">{source.name}</span>
                  <span className="font-semibold text-base-300">{source.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
