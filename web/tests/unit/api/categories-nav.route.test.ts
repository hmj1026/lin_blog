import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "@/app/api/categories/[id]/route";
import { GET as getNav } from "@/app/api/nav/route";
import { requirePermission, jsonOk, jsonError, handleApiError } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
  jsonOk: vi.fn((data) => Response.json({ success: true, data })),
  jsonError: vi.fn((msg) => Response.json({ success: false, message: msg }, { status: 400 })),
  handleApiError: vi.fn((e) => Response.json({ message: (e as Error).message }, { status: 500 })),
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    updateCategory: vi.fn(),
    removeCategory: vi.fn(),
    listActiveCategories: vi.fn(),
  },
}));

vi.mock("@/modules/site-settings", () => ({
  siteSettingsUseCases: {
    getDefault: vi.fn(),
  },
}));

describe("Categories [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      (siteSettingsUseCases.getDefault as any).mockResolvedValue({ showBlogLink: true });
      (postsUseCases.listActiveCategories as any).mockResolvedValue([
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
      (siteSettingsUseCases.getDefault as any).mockResolvedValue(null);
      (postsUseCases.listActiveCategories as any).mockResolvedValue([]);

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
