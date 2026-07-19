import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/env", () => ({ env: { CRON_SECRET: "test-cron-secret" } }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock("@/modules/posts", () => ({
  postsUseCases: { publishScheduledPosts: vi.fn().mockResolvedValue({ count: 0, published: [] }) },
}));
vi.mock("@/modules/audit", () => ({
  auditUseCases: { purgeExpiredAuditEvents: vi.fn().mockResolvedValue(0) },
}));

import { GET, POST } from "@/app/api/cron/publish-scheduled/route";
import { env } from "@/env";
import { postsUseCases } from "@/modules/posts";
import { auditUseCases } from "@/modules/audit";

function req(auth?: string) {
  const headers = new Headers();
  if (auth) headers.set("authorization", auth);
  return new Request("http://localhost/api/cron/publish-scheduled", { headers }) as any;
}

describe("cron publish-scheduled auth (fail-closed)", () => {
  beforeEach(() => {
    (env as any).CRON_SECRET = "test-cron-secret";
  });

  it("rejects with 500 when CRON_SECRET is not configured", async () => {
    (env as any).CRON_SECRET = "";
    const res = await GET(req("Bearer whatever"));
    expect(res.status).toBe(500);
  });

  it("rejects with 401 when Authorization header does not match", async () => {
    const res = await GET(req("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("accepts when Authorization header matches", async () => {
    const res = await GET(req("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
  });

  it("POST enforces the same fail-closed auth (401 on mismatch)", async () => {
    const res = await POST(req("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("POST accepts when Authorization header matches", async () => {
    const res = await POST(req("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
  });
});

describe("cron publish-scheduled state transition", () => {
  beforeEach(() => {
    (env as any).CRON_SECRET = "test-cron-secret";
    (postsUseCases.publishScheduledPosts as any).mockClear();
  });

  it("publishes due scheduled posts and reports the count", async () => {
    (postsUseCases.publishScheduledPosts as any).mockResolvedValueOnce({
      count: 2,
      published: [
        { id: "p1", slug: "a", publishedAt: new Date("2024-01-01") },
        { id: "p2", slug: "b", publishedAt: new Date("2024-01-02") },
      ],
    });

    const res = await GET(req("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.published).toHaveLength(2);
    expect(body.message).toContain("2");
  });

  it("每次授權執行都獨立清除逾期稽核事件（與事件寫入解耦）", async () => {
    (auditUseCases.purgeExpiredAuditEvents as any).mockClear();
    const res = await GET(req("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    expect(auditUseCases.purgeExpiredAuditEvents).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when there are no due posts", async () => {
    (postsUseCases.publishScheduledPosts as any).mockResolvedValueOnce({
      count: 0,
      published: [],
    });

    const res = await GET(req("Bearer test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.published).toEqual([]);
    expect(body.message).toBe("No scheduled posts to publish");
    expect(postsUseCases.publishScheduledPosts).toHaveBeenCalledTimes(1);
  });
});
