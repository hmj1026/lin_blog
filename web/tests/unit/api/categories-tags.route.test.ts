import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getCategories, POST as postCategories } from "@/app/api/categories/route";
import { GET as getTags, POST as postTags } from "@/app/api/tags/route";
import { postsUseCases } from "@/modules/posts";
import { requirePermission } from "@/lib/api-utils";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    listActiveCategories: vi.fn(),
    createCategory: vi.fn(),
    listActiveTags: vi.fn(),
    createTag: vi.fn(),
  },
}));

vi.mock("@/lib/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-utils")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
  };
});

describe("API: Categories & Tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Categories", () => {
    it("GET: returns categories", async () => {
      const mockCats = [{ id: "1", name: "Tech", slug: "tech" }];
      (postsUseCases.listActiveCategories as any).mockResolvedValue(mockCats);

      const response = await getCategories();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toEqual(mockCats);
    });

    it("POST: creates category when authorized", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const mockCat = { id: "1", name: "Tech", slug: "tech" };
      (postsUseCases.createCategory as any).mockResolvedValue(mockCat);

      const request = new Request("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: "Tech", slug: "tech", showInNav: true, navOrder: 1 }),
      });

      const response = await postCategories(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data).toEqual(mockCat);
      expect(postsUseCases.createCategory).toHaveBeenCalledWith(expect.objectContaining({ name: "Tech" }));
    });

    it("POST: returns 400 on validation error", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const request = new Request("http://localhost/api/categories", {
        method: "POST",
        body: JSON.stringify({}), // Missing required fields
      });

      const response = await postCategories(request);
      expect(response.status).toBe(400);
    });
  });

  describe("Tags", () => {
    it("GET: returns tags", async () => {
      const mockTags = [{ id: "1", name: "React", slug: "react" }];
      (postsUseCases.listActiveTags as any).mockResolvedValue(mockTags);

      const response = await getTags();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toEqual(mockTags);
    });

    it("POST: creates tag when authorized", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const mockTag = { id: "1", name: "React", slug: "react" };
      (postsUseCases.createTag as any).mockResolvedValue(mockTag);

      const request = new Request("http://localhost/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "React", slug: "react" }),
      });

      const response = await postTags(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data).toEqual(mockTag);
    });

    it("POST: returns 400 on validation error", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const request = new Request("http://localhost/api/tags", {
        method: "POST",
        body: JSON.stringify({}), // Missing name/slug
      });

      const response = await postTags(request);
      expect(response.status).toBe(400);
    });
  });
});
