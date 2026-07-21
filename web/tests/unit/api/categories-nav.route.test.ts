import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/server/audit-safe", () => ({ recordAuditEventSafely: vi.fn().mockResolvedValue(true) }));
import { GET as getCategoryImpact, PUT, PATCH, DELETE } from "@/app/api/categories/[id]/route";
import { GET as getNav } from "@/app/api/nav/route";
import { requirePermission, jsonOk, jsonError, handleApiError } from "@/lib/api-utils";
import { postsQueries, siteSettingsQueries } from "@/lib/server-queries";
import { postsUseCases } from "@/modules/posts";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
  jsonOk: vi.fn((data) => Response.json({ success: true, data })),
  jsonError: vi.fn((msg) => Response.json({ success: false, message: msg }, { status: 400 })),
  handleApiError: vi.fn((e) => Response.json({ message: (e as Error).message }, { status: 500 })),
}));

vi.mock("@/lib/server-queries", () => ({
  postsQueries: {
    listActiveCategories: vi.fn(),
  },
  siteSettingsQueries: {
    getDefault: vi.fn(),
  },
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    updateCategory: vi.fn(),
    removeCategory: vi.fn(),
    getCategoryDeletionImpact: vi.fn(),
    restoreCategory: vi.fn(),
    mergeCategory: vi.fn(),
  },
}));

describe("Categories [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns category deletion impact before confirmation", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (postsUseCases.getCategoryDeletionImpact as any).mockResolvedValue({ affectedPosts: 3 });
    const context = { params: Promise.resolve({ id: "1" }) };

    await getCategoryImpact(new Request("http://localhost/api/categories/1"), context);

    expect(jsonOk).toHaveBeenCalledWith({ affectedPosts: 3 });
  });

  it("restores a soft-deleted category", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (postsUseCases.restoreCategory as any).mockResolvedValue({ id: "1" });
    const context = { params: Promise.resolve({ id: "1" }) };

    await PATCH(new Request("http://localhost/api/categories/1", { method: "PATCH" }), context);

    expect(postsUseCases.restoreCategory).toHaveBeenCalledWith("1");
    expect(jsonOk).toHaveBeenCalledWith({ id: "1" });
  });

  it("merges a category into a different active category", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (postsUseCases.mergeCategory as any).mockResolvedValue({ id: "1", movedPosts: 4 });
    const context = { params: Promise.resolve({ id: "1" }) };

    await PATCH(new Request("http://localhost/api/categories/1", {
      method: "PATCH",
      body: JSON.stringify({ mergeIntoId: "2" }),
    }), context);

    expect(postsUseCases.mergeCategory).toHaveBeenCalledWith("1", "2");
    expect(jsonOk).toHaveBeenCalledWith({ id: "1", movedPosts: 4 });
  });

  it("rejects malformed merge target instead of silently restoring", async () => {
    (requirePermission as any).mockResolvedValue(null);
    const context = { params: Promise.resolve({ id: "1" }) };

    await PATCH(new Request("http://localhost/api/categories/1", {
      method: "PATCH",
      body: JSON.stringify({ mergeIntoId: "   " }),
    }), context);

    expect(jsonError).toHaveBeenCalledWith("mergeIntoId 必須為非空字串", 400);
    expect(postsUseCases.restoreCategory).not.toHaveBeenCalled();
    expect(postsUseCases.mergeCategory).not.toHaveBeenCalled();
  });

  it("rejects non-JSON bodies with 400", async () => {
    (requirePermission as any).mockResolvedValue(null);
    const context = { params: Promise.resolve({ id: "1" }) };

    await PATCH(new Request("http://localhost/api/categories/1", { method: "PATCH", body: "not-json" }), context);

    expect(jsonError).toHaveBeenCalledWith("請求內容不是有效的 JSON", 400);
    expect(postsUseCases.restoreCategory).not.toHaveBeenCalled();
  });

  describe("PUT /api/categories/[id]", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/categories/1", {
        method: "PUT",
        body: JSON.stringify({ name: "test", slug: "test" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      const res = await PUT(req, context);
      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid data", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const req = new Request("http://localhost/api/categories/1", {
        method: "PUT",
        body: JSON.stringify({ name: "" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      await PUT(req, context);
      expect(jsonError).toHaveBeenCalled();
    });

    it("should update category successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.updateCategory as any).mockResolvedValue({ id: "1", name: "Updated" });

      const req = new Request("http://localhost/api/categories/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated", slug: "updated" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      await PUT(req, context);
      expect(jsonOk).toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.updateCategory as any).mockRejectedValue(new Error("DB error"));

      const req = new Request("http://localhost/api/categories/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Test", slug: "test" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      await PUT(req, context);
      expect(handleApiError).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/categories/[id]", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/categories/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      const res = await DELETE(req, context);
      expect(res.status).toBe(401);
    });

    it("should delete category successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.removeCategory as any).mockResolvedValue({ id: "1" });

      const req = new Request("http://localhost/api/categories/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      await DELETE(req, context);
      expect(jsonOk).toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.removeCategory as any).mockRejectedValue(new Error("Error"));

      const req = new Request("http://localhost/api/categories/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      await DELETE(req, context);
      expect(handleApiError).toHaveBeenCalled();
    });
  });
});

describe("Nav API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/nav", () => {
    it("should return nav settings and categories", async () => {
      (siteSettingsQueries.getDefault as any).mockResolvedValue({ showBlogLink: true });
      (postsQueries.listActiveCategories as any).mockResolvedValue([
        { slug: "tech", name: "Technology" },
      ]);

      await getNav();

      expect(jsonOk).toHaveBeenCalledWith(
        expect.objectContaining({
          showBlogLink: true,
          categories: [{ slug: "tech", name: "Technology" }],
        })
      );
    });

    it("should handle null settings", async () => {
      (siteSettingsQueries.getDefault as any).mockResolvedValue(null);
      (postsQueries.listActiveCategories as any).mockResolvedValue([]);

      await getNav();

      expect(jsonOk).toHaveBeenCalledWith(
        expect.objectContaining({
          showBlogLink: true,
          categories: [],
        })
      );
    });
  });
});
