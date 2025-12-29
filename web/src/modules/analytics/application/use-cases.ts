import crypto from "crypto";
import type { AnalyticsRepository, ListPostViewEventsFilter } from "./ports";
import { clampInt, detectDeviceType, isBotUserAgent, parseSimpleUA, type DeviceType } from "../domain";

export type AnalyticsUseCases = ReturnType<typeof createAnalyticsUseCases>;

const MAX_SUMMARY_EVENTS = 5000;
const MAX_PAGE_SIZE = 100;
const RECENT_FINGERPRINT_WINDOW_MS = 30 * 60 * 1000;
const TOP_POSTS_LIMIT = 10;

export function createAnalyticsUseCases(deps: { analytics: AnalyticsRepository }) {
  return {
    listPostAnalyticsSummary: async (params: { days: number }) => {
      const safeDays = clampInt(params.days, 1, 90);
      const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
      const events = await deps.analytics.listEventsSince({ since, take: MAX_SUMMARY_EVENTS });

      const rows = new Map<
        string,
        { postId: string; slug: string; title: string; views: number; uniques: Set<string>; lastViewedAt: Date }
      >();

      for (const e of events) {
        if (!e.post || e.post.deletedAt) continue;
        const existing = rows.get(e.postId);
        if (!existing) {
          rows.set(e.postId, {
            postId: e.postId,
            slug: e.post.slug,
            title: e.post.title,
            views: 1,
            uniques: new Set([e.fingerprint]),
            lastViewedAt: e.viewedAt,
          });
          continue;
        }
        existing.views += 1;
        existing.uniques.add(e.fingerprint);
        if (e.viewedAt > existing.lastViewedAt) existing.lastViewedAt = e.viewedAt;
      }

      return Array.from(rows.values())
        .map((r) => ({ ...r, uniqueCount: r.uniques.size }))
        .sort((a, b) => b.views - a.views || b.uniqueCount - a.uniqueCount);
    },

    countViews: async (params: { days: number }) => {
      const safeDays = clampInt(params.days, 1, 90);
      const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
      return deps.analytics.countViewEventsSince({ since });
    },

    getDashboardStats: async (params: { days: number }) => {
      const safeDays = clampInt(params.days, 1, 90);
      const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
      const stats = await deps.analytics.getDashboardStats({ since, takeTopPosts: TOP_POSTS_LIMIT });

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
        trend: stats.trend,
        topPosts: stats.topPosts,
        devices: stats.devices,
        browsers: toStatArray(browserMap),
        os: toStatArray(osMap),
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
