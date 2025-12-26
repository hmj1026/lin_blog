"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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
};

export function DashboardCharts() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"device" | "browser" | "os">("device");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/stats?days=${days}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      console.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return <div className="h-64 flex items-center justify-center text-base-300">載入中...</div>;
  }

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

  return (
    <div className="space-y-6">
      {/* 時間範圍選擇 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-base-300">時間範圍：</span>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              days === d ? "bg-primary text-white" : "bg-base-100 text-primary hover:bg-base-200"
            }`}
          >
            {d} 天
          </button>
        ))}
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
      </div>
    </div>
  );
}
