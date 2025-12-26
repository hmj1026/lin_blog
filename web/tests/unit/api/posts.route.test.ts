import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/posts/route";
import { postsUseCases } from "@/modules/posts";
import { requirePermission } from "@/lib/api-utils";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    listPublishedPosts: vi.fn(),
    createPost: vi.fn(),
  },
}));

vi.mock("@/lib/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-utils")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
  };
});

describe("API: /api/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns published posts", async () => {
      const mockPosts = [{ id: "1", title: "Test" }];
      (postsUseCases.listPublishedPosts as any).mockResolvedValue(mockPosts);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toEqual(mockPosts);
      expect(postsUseCases.listPublishedPosts).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("creates a post when authorized and valid", async () => {
      (requirePermission as any).mockResolvedValue(null); // Authorized
      (postsUseCases.createPost as any).mockResolvedValue({ id: "1" });

      const request = new Request("http://localhost/api/posts", {
        method: "POST",
        body: JSON.stringify({
          title: "New Post",
          content: "Content",
          slug: "new-post",
          excerpt: "Summary",
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.id).toBe("1");
    });

    it("returns error when unauthorized", async () => {
      const errorResponse = NextResponse.json({ message: "Forbidden" }, { status: 403 });
      (requirePermission as any).mockResolvedValue(errorResponse);

      const request = new Request("http://localhost/api/posts", {
        method: "POST",
        body: JSON.stringify({ title: "New Post" }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(403);
      expect(postsUseCases.createPost).not.toHaveBeenCalled();
    });

    it("returns 400 when input is invalid", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const request = new Request("http://localhost/api/posts", {
        method: "POST",
        body: JSON.stringify({}), // Missing required fields
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
    });
  });
});
