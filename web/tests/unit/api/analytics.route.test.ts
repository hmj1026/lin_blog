import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getStats } from "@/app/api/analytics/stats/route";
import { POST as postViews } from "@/app/api/analytics/views/route";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
  jsonOk: vi.fn((data) => Response.json({ success: true, data })),
}));

vi.mock("@/modules/analytics", () => ({
  analyticsUseCases: {
    getDashboardStats: vi.fn(),
    recordPostView: vi.fn(),
  },
}));

vi.mock("@/lib/server-queries", () => ({
  postsQueries: {
    getPostBySlug: vi.fn(),
  },
  analyticsQueries: {
    getDashboardStats: vi.fn(),
  },
}));

import { requirePermission, jsonOk } from "@/lib/api-utils";
import { analyticsUseCases } from "@/modules/analytics";
import { postsQueries, analyticsQueries } from "@/lib/server-queries";

describe("Analytics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/analytics/stats", () => {
    it("stats returns aggregated data when authorized", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (analyticsQueries.getDashboardStats as any).mockResolvedValue({ totalViews: 42 });

      const res = await getStats(new Request("http://localhost/api/analytics/stats?days=7") as any);
      expect(res.status).toBe(200);
      expect(analyticsQueries.getDashboardStats).toHaveBeenCalledWith({ days: 7 });
      expect(jsonOk).toHaveBeenCalledWith({ totalViews: 42 });
    });

    it("stats returns auth error when unauthorized", async () => {
      (requirePermission as any).mockResolvedValue(Response.json({ success: false }, { status: 401 }));

      const res = await getStats(new Request("http://localhost/api/analytics/stats") as any);
      expect(res.status).toBe(401);
      expect(analyticsQueries.getDashboardStats).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/analytics/views", () => {
    it("views records a hit for a valid payload", async () => {
      (postsQueries.getPostBySlug as any).mockResolvedValue({
        id: "p1",
        slug: "hello",
        deletedAt: null,
        status: "PUBLISHED",
      });
      // NOTE: return an object WITHOUT an "ignored" key so route hits the {ok:true} branch.
      (analyticsUseCases.recordPostView as any).mockResolvedValue({});

      const res = await postViews(
        new Request("http://localhost/api/analytics/views", {
          method: "POST",
          body: JSON.stringify({ slug: "hello" }),
        })
      );
      expect(res.status).toBe(200);
      expect(analyticsUseCases.recordPostView).toHaveBeenCalled();
    });

    it("views ignores an invalid payload without writing", async () => {
      const res = await postViews(
        new Request("http://localhost/api/analytics/views", {
          method: "POST",
          body: JSON.stringify({}),
        })
      );
      expect(res.status).toBe(200);
      expect(postsQueries.getPostBySlug).not.toHaveBeenCalled();
      expect(analyticsUseCases.recordPostView).not.toHaveBeenCalled();
    });
  });
});
