import { clampInt } from "./rules";

export const ANALYTICS_TIME_ZONE = "Asia/Taipei";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const TAIPEI_OFFSET_IN_MILLISECONDS = 8 * 60 * 60 * 1000;

export type TrafficSource =
  | "INTERNAL"
  | "ORGANIC_SEARCH"
  | "SOCIAL"
  | "REFERRAL"
  | "DIRECT_UNKNOWN";

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSource, string> = {
  INTERNAL: "站內",
  ORGANIC_SEARCH: "自然搜尋",
  SOCIAL: "社群",
  REFERRAL: "外部推薦",
  DIRECT_UNKNOWN: "直接／未知",
};

export type AnalyticsDateRange = {
  days: number;
  timeZone: typeof ANALYTICS_TIME_ZONE;
  since: Date;
  until: Date;
  previousSince: Date;
  previousUntil: Date;
  dateKeys: string[];
};

/** 建立以 Asia/Taipei 日界線切分、最長 90 天的本期與同長前期範圍。 */
export function buildAnalyticsDateRange(params: { days: number; now: Date }): AnalyticsDateRange {
  const days = clampInt(params.days, 1, 90);
  const taipeiNow = new Date(params.now.getTime() + TAIPEI_OFFSET_IN_MILLISECONDS);
  const currentLocalDay = Date.UTC(
    taipeiNow.getUTCFullYear(),
    taipeiNow.getUTCMonth(),
    taipeiNow.getUTCDate()
  );
  const sinceLocal = currentLocalDay - (days - 1) * DAY_IN_MILLISECONDS;
  const untilLocal = currentLocalDay + DAY_IN_MILLISECONDS;
  const since = new Date(sinceLocal - TAIPEI_OFFSET_IN_MILLISECONDS);
  const until = new Date(untilLocal - TAIPEI_OFFSET_IN_MILLISECONDS);
  const previousUntil = since;
  const previousSince = new Date(since.getTime() - days * DAY_IN_MILLISECONDS);
  const dateKeys = Array.from({ length: days }, (_, index) =>
    new Date(sinceLocal + index * DAY_IN_MILLISECONDS).toISOString().slice(0, 10)
  );

  return {
    days,
    timeZone: ANALYTICS_TIME_ZONE,
    since,
    until,
    previousSince,
    previousUntil,
    dateKeys,
  };
}

/** 依指定日期序列補齊沒有事件的零值日期。 */
export function fillDailyTrend(
  dateKeys: string[],
  rows: Array<{ date: string; count: number }>
): Array<{ date: string; count: number }> {
  const counts = new Map(rows.map((row) => [row.date, row.count]));
  return dateKeys.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/** 將 referer 穩定分類為站內、搜尋、社群、推薦或直接／未知。 */
export function classifyTrafficSource(
  referer: string | null | undefined,
  options: { internalHosts?: string[] } = {}
): TrafficSource {
  const value = referer?.trim();
  if (!value) return "DIRECT_UNKNOWN";
  if (value.startsWith("/")) return "INTERNAL";

  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    if (!host) return "DIRECT_UNKNOWN";
    const internalHosts = (options.internalHosts ?? []).map((item) => item.toLowerCase().replace(/^www\./, ""));
    if (internalHosts.some((item) => host === item || host.endsWith(`.${item}`))) return "INTERNAL";
    if (isKnownHost(host, ["google.", "bing.com", "search.yahoo.com", "duckduckgo.com", "baidu.com"])) {
      return "ORGANIC_SEARCH";
    }
    if (isKnownHost(host, ["facebook.com", "instagram.com", "linkedin.com", "twitter.com", "x.com", "t.co", "threads.net", "youtube.com"])) {
      return "SOCIAL";
    }
    return "REFERRAL";
  } catch {
    return "DIRECT_UNKNOWN";
  }
}

/** 遮罩事件稽核中的網路位址，避免預設揭露完整識別資訊。 */
export function maskIpAddress(ip: string): string {
  if (ip.includes(":")) {
    const segments = ip.split(":").filter(Boolean);
    return `${segments.slice(0, 3).join(":")}:xxxx`;
  }
  const segments = ip.split(".");
  if (segments.length === 4) return `${segments.slice(0, 3).join(".")}.xxx`;
  return "已遮罩";
}

/** 計算本期相對前期百分比；前期為零且本期有值時回傳 null 表示新流量。 */
export function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** 判斷 hostname 是否符合已知主機片段或 suffix。 */
function isKnownHost(host: string, patterns: string[]): boolean {
  return patterns.some((pattern) =>
    pattern.endsWith(".")
      ? host.includes(pattern)
      : host === pattern || host.endsWith(`.${pattern}`)
  );
}
