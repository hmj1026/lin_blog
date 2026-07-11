import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/posts/[id]/versions/[versionId]/route";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
  jsonOk: vi.fn((data) => Response.json({ success: true, data })),
  jsonError: vi.fn((msg, status) => Response.json({ success: false, message: msg }, { status })),
}));

vi.mock("@/lib/server-queries", () => ({
  postsQueries: {
    getPostVersion: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    restorePostVersion: vi.fn(),
  },
}));

import { requirePermission, jsonOk, jsonError } from "@/lib/api-utils";
import { postsQueries } from "@/lib/server-queries";
import { getSession } from "@/lib/auth";
import { postsUseCases } from "@/modules/posts";

describe("/api/posts/[id]/versions/[versionId]", () => {
  const ctx = { params: Promise.resolve({ id: "1", versionId: "v1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a single version", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (postsQueries.getPostVersion as any).mockResolvedValue({
      id: "v1",
      title: "T",
      excerpt: "E",
      content: "C",
      editor: { name: "Ed", email: "e@x.com" },
      createdAt: new Date("2024-01-01"),
    });

    const res = await GET(new Request("http://localhost/api/posts/1/versions/v1"), ctx);
    expect(res.status).toBe(200);
    expect(jsonOk).toHaveBeenCalled();
  });

  it("includes both allowRawHtml and showRawHtmlToc in the version detail response", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (postsQueries.getPostVersion as any).mockResolvedValue({
      id: "v1",
      title: "T",
      excerpt: "E",
      content: "C",
      allowRawHtml: true,
      showRawHtmlToc: true,
      editor: { name: "Ed", email: "e@x.com" },
      createdAt: new Date("2024-01-01"),
    });

    await GET(new Request("http://localhost/api/posts/1/versions/v1"), ctx);

    const call = (jsonOk as any).mock.calls[0]?.[0];
    expect(call?.allowRawHtml).toBe(true);
    expect(call?.showRawHtmlToc).toBe(true);
  });

  it("returns 404 when versionId does not belong to the post", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (postsQueries.getPostVersion as any).mockResolvedValue(null);

    await GET(new Request("http://localhost/api/posts/1/versions/v1"), ctx);
    expect(jsonError).toHaveBeenCalledWith("版本不存在", 404);
  });

  it("restore overwrites the post via the use case", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (getSession as any).mockResolvedValue({ user: { id: "u1" } });
    (postsUseCases.restorePostVersion as any).mockResolvedValue({ ok: true });

    const res = await POST(
      new Request("http://localhost/api/posts/1/versions/v1", { method: "POST" }),
      ctx
    );
    expect(postsUseCases.restorePostVersion).toHaveBeenCalledWith("1", "v1", "u1");
    expect(jsonOk).toHaveBeenCalled();
  });

  it("GET rejects and short-circuits when posts:write is denied", async () => {
    (requirePermission as any).mockResolvedValue(Response.json({ success: false }, { status: 401 }));

    const res = await GET(new Request("http://localhost/api/posts/1/versions/v1"), ctx);
    expect(res.status).toBe(401);
    expect(postsQueries.getPostVersion).not.toHaveBeenCalled();
  });

  it("POST rejects and short-circuits when posts:write is denied", async () => {
    (requirePermission as any).mockResolvedValue(Response.json({ success: false }, { status: 401 }));

    const res = await POST(
      new Request("http://localhost/api/posts/1/versions/v1", { method: "POST" }),
      ctx
    );
    expect(res.status).toBe(401);
    expect(postsUseCases.restorePostVersion).not.toHaveBeenCalled();
  });

  it("returns 404 when restore reports post-not-found", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (getSession as any).mockResolvedValue({ user: { id: "u1" } });
    (postsUseCases.restorePostVersion as any).mockResolvedValue({ ok: false, error: "post-not-found" });

    await POST(new Request("http://localhost/api/posts/1/versions/v1", { method: "POST" }), ctx);
    expect(jsonError).toHaveBeenCalledWith("文章不存在", 404);
  });

  it("returns 409 when restore conflicts with a concurrent edit", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (getSession as any).mockResolvedValue({ user: { id: "u1" } });
    (postsUseCases.restorePostVersion as any).mockResolvedValue({ ok: false, error: "conflict" });

    await POST(new Request("http://localhost/api/posts/1/versions/v1", { method: "POST" }), ctx);
    expect(jsonError).toHaveBeenCalledWith("文章已被其他人更新，請重新整理後再試", 409);
  });

  it("returns 404 when restore reports version-not-found", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (getSession as any).mockResolvedValue({ user: { id: "u1" } });
    (postsUseCases.restorePostVersion as any).mockResolvedValue({ ok: false, error: "version-not-found" });

    await POST(new Request("http://localhost/api/posts/1/versions/v1", { method: "POST" }), ctx);
    expect(jsonError).toHaveBeenCalledWith("版本不存在", 404);
  });
});
