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
  listEventsSince(params: { since: Date; take: number }): Promise<Array<{ postId: string; viewedAt: Date; fingerprint: string; post: PostSummary | null }>>;
  countViewEventsSince(params: { since: Date }): Promise<number>;
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
  getDashboardStats(params: { since: Date; takeTopPosts: number }): Promise<DashboardStats>;
  listPostViewEvents(params: {
    filter: ListPostViewEventsFilter;
    page: number;
    pageSize: number;
  }): Promise<{ total: number; events: PostViewEventRecord[] }>;
}
