import crypto from "crypto";
import type { AnalyticsRepository, ListPostViewEventsFilter } from "./ports";
import {
  buildAnalyticsDateRange,
  calculatePercentChange,
  clampInt,
  classifyTrafficSource,
  detectDeviceType,
  fillDailyTrend,
  isBotUserAgent,
  parseSimpleUA,
  TRAFFIC_SOURCE_LABELS,
  type DeviceType,
  type TrafficSource,
} from "../domain";

export type AnalyticsUseCases = ReturnType<typeof createAnalyticsUseCases>;

const MAX_PAGE_SIZE = 100;
const RECENT_FINGERPRINT_WINDOW_MS = 30 * 60 * 1000;
const TOP_POSTS_LIMIT = 10;

export function createAnalyticsUseCases(deps: {
  analytics: AnalyticsRepository;
  now?: () => Date;
  internalHosts?: string[];
}) {
  const now = deps.now ?? (() => new Date());

  return {
    listPostAnalyticsSummary: async (params: { days: number; categoryId?: string; tagId?: string; publishedFrom?: Date; publishedTo?: Date }) => {
      const range = buildAnalyticsDateRange({ days: params.days, now: now() });
      const rows = await deps.analytics.listPostAnalyticsSummaries({
        ...range,
        categoryId: params.categoryId,
        tagId: params.tagId,
        publishedFrom: params.publishedFrom,
        publishedTo: params.publishedTo,
      });
      const referers = rows.length > 0
        ? await deps.analytics.listRefererCounts({ since: range.since, until: range.until, groupByPost: true, postIds: rows.map((row) => row.postId) })
        : [];
      const sourcesByPost = aggregateTrafficSourcesByPost(referers, deps.internalHosts);

      return rows.map((row) => ({
        ...row,
        percentChange: calculatePercentChange(row.views, row.previousViews),
        sources: sourcesByPost.get(row.postId) ?? [],
      }));
    },

    countViews: async (params: { days: number }) => {
      const range = buildAnalyticsDateRange({ days: params.days, now: now() });
      return deps.analytics.countViewEventsSince({ since: range.since, until: range.until });
    },

    getDashboardStats: async (params: { days: number }) => {
      const range = buildAnalyticsDateRange({ days: params.days, now: now() });
      const stats = await deps.analytics.getDashboardStats({ ...range, takeTopPosts: TOP_POSTS_LIMIT });

      const browserMap = new Map<string, number>();
      const osMap = new Map<string, number>();
      for (const row of stats.userAgents) {
        const { browser, os } = parseSimpleUA(row.userAgent);
        browserMap.set(browser, (browserMap.get(browser) || 0) + row.count);
        osMap.set(os, (osMap.get(os) || 0) + row.count);
      }

      const toStatArray = (map: Map<string, number>) =>
        Array.from(map.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

      return {
        trend: fillDailyTrend(range.dateKeys, stats.trend),
        topPosts: stats.topPosts,
        devices: stats.devices,
        browsers: toStatArray(browserMap),
        os: toStatArray(osMap),
        sources: aggregateTrafficSources(stats.referers, deps.internalHosts),
        comparison: {
          current: stats.totalViews,
          previous: stats.previousTotalViews,
          percentChange: calculatePercentChange(stats.totalViews, stats.previousTotalViews),
        },
        period: { days: range.days, timeZone: range.timeZone },
      };
    },

    recordPostView: async (params: {
      post: { id: string; slug: string; deletedAt: Date | null; status: "PUBLISHED" | "DRAFT" | "SCHEDULED" };
      source?: "frontend" | "preview";
      ip: string;
      userAgent: string;
      referer?: string;
      acceptLanguage?: string;
    }) => {
      if (params.source === "preview") return { ignored: true as const };
      if (params.post.deletedAt || params.post.status !== "PUBLISHED") return { ignored: true as const };

      const ua = params.userAgent ?? "";
      if (isBotUserAgent(ua)) return { ignored: true as const };

      const fingerprint = crypto.createHash("sha256").update(`${params.ip}|${ua}`).digest("hex");
      const deviceType = detectDeviceType(ua);

      const since = new Date(Date.now() - RECENT_FINGERPRINT_WINDOW_MS);
      const recent = await deps.analytics.findRecentViewEvent({ postId: params.post.id, fingerprint, since });
      if (recent) return { ignored: true as const };

      await deps.analytics.createViewEvent({
        postId: params.post.id,
        slug: params.post.slug,
        ip: params.ip,
        userAgent: ua,
        referer: params.referer ?? null,
        acceptLanguage: params.acceptLanguage ?? null,
        deviceType,
        fingerprint,
      });

      return { ok: true as const, deviceType: deviceType satisfies DeviceType };
    },

    getPostSummary: (postId: string) => deps.analytics.getPostSummary(postId),

    listPostViewEvents: async (params: {
      postId: string;
      from?: Date;
      to?: Date;
      deviceType?: DeviceType;
      ipMode?: "contains" | "equals";
      ip?: string;
      userAgent?: string;
      referer?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const page = clampInt(params.page ?? 1, 1, 10_000);
      const pageSize = clampInt(params.pageSize ?? 50, 1, MAX_PAGE_SIZE);

      const filter: ListPostViewEventsFilter = {
        postId: params.postId,
        since: params.from,
        until: params.to,
        deviceType: params.deviceType,
        ip:
          params.ip?.trim() && params.ipMode
            ? { mode: params.ipMode, value: params.ip.trim() }
            : undefined,
        userAgentContains: params.userAgent?.trim() ? params.userAgent.trim() : undefined,
        refererContains: params.referer?.trim() ? params.referer.trim() : undefined,
      };

      return deps.analytics.listPostViewEvents({ filter, page, pageSize });
    },
  };
}

/** 將 referer 計數依來源 SSOT 合併並由高至低排序。 */
function aggregateTrafficSources(
  rows: Array<{ referer: string | null; count: number }>,
  internalHosts: string[] = []
) {
  const totals = new Map<TrafficSource, number>();
  for (const row of rows) {
    const source = classifyTrafficSource(row.referer, { internalHosts });
    totals.set(source, (totals.get(source) ?? 0) + row.count);
  }
  return Array.from(totals, ([source, count]) => ({ source, name: TRAFFIC_SOURCE_LABELS[source], count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}

/** 將每篇文章的 referer 計數分組後套用同一來源分類規則。 */
function aggregateTrafficSourcesByPost(
  rows: Array<{ postId: string | null; referer: string | null; count: number }>,
  internalHosts: string[] = []
) {
  const grouped = new Map<string, Array<{ referer: string | null; count: number }>>();
  for (const row of rows) {
    if (!row.postId) continue;
    const current = grouped.get(row.postId) ?? [];
    current.push({ referer: row.referer, count: row.count });
    grouped.set(row.postId, current);
  }
  return new Map(Array.from(grouped, ([postId, counts]) => [postId, aggregateTrafficSources(counts, internalHosts)]));
}
