import type { DeviceType } from "../domain";

export type PostSummary = { id: string; slug: string; title: string; deletedAt: Date | null };

export type PostViewEventRecord = {
  id: string;
  postId: string;
  viewedAt: Date;
  ip: string;
  userAgent: string;
  referer: string | null;
  acceptLanguage: string | null;
  deviceType: DeviceType;
  fingerprint: string;
};

export type DashboardStats = {
  trend: Array<{ date: string; count: number }>;
  topPosts: Array<{ postId: string; slug: string; title: string; count: number }>;
  devices: Array<{ type: DeviceType; count: number }>;
  userAgents: Array<{ userAgent: string; count: number }>;
  referers: Array<{ referer: string | null; count: number }>;
  totalViews: number;
  previousTotalViews: number;
};

export type PostAnalyticsAggregate = {
  postId: string;
  slug: string;
  title: string;
  views: number;
  uniqueCount: number;
  previousViews: number;
  previousUniqueCount: number;
  lastViewedAt: Date | null;
};

export type AnalyticsPeriod = {
  since: Date;
  until: Date;
  previousSince: Date;
  previousUntil: Date;
  categoryId?: string;
  tagId?: string;
  publishedFrom?: Date;
  publishedTo?: Date;
};

export type ListPostViewEventsFilter = {
  postId: string;
  since?: Date;
  until?: Date;
  deviceType?: DeviceType;
  ip?: { mode: "contains" | "equals"; value: string };
  userAgentContains?: string;
  refererContains?: string;
};

export interface AnalyticsRepository {
  getPostSummary(postId: string): Promise<PostSummary | null>;
  listPostAnalyticsSummaries(params: AnalyticsPeriod): Promise<PostAnalyticsAggregate[]>;
  listRefererCounts(params: { since: Date; until: Date; groupByPost: boolean; postIds?: string[] }): Promise<Array<{ postId: string | null; referer: string | null; count: number }>>;
  countViewEventsSince(params: { since: Date; until: Date }): Promise<number>;
  findRecentViewEvent(params: { postId: string; fingerprint: string; since: Date }): Promise<{ id: string } | null>;
  createViewEvent(data: {
    postId: string;
    slug: string;
    ip: string;
    userAgent: string;
    referer?: string | null;
    acceptLanguage?: string | null;
    deviceType: DeviceType;
    fingerprint: string;
  }): Promise<{ id: string }>;
  getDashboardStats(params: AnalyticsPeriod & { takeTopPosts: number }): Promise<DashboardStats>;
  listPostViewEvents(params: {
    filter: ListPostViewEventsFilter;
    page: number;
    pageSize: number;
  }): Promise<{ total: number; events: PostViewEventRecord[] }>;
}
