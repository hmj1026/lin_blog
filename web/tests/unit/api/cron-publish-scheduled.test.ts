import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/env", () => ({ env: { CRON_SECRET: "test-cron-secret" } }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock("@/modules/posts", () => ({
  postsUseCases: { publishScheduledPosts: vi.fn().mockResolvedValue({ count: 0, published: [] }) },
}));

import { GET, POST } from "@/app/api/cron/publish-scheduled/route";
import { env } from "@/env";

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
