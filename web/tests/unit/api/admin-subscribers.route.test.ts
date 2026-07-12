import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/subscribers/route";
import { newsletterQueries } from "@/lib/server-queries";
import { requirePermission } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/server-queries", () => ({
  newsletterQueries: {
    listSubscribers: vi.fn(),
  },
}));

vi.mock("@/lib/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-utils")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
  };
});

function makeRequest(query = "") {
  return new Request(`http://localhost/api/admin/subscribers${query}`) as any;
}

describe("GET /api/admin/subscribers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires the subscribers:view permission before reading any data", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0 });

    await GET(makeRequest());

    expect(requirePermission).toHaveBeenCalledWith("subscribers:view");
  });

  it("returns 401 with no data/total for unauthenticated requests", async () => {
    (requirePermission as any).mockResolvedValue(
      Response.json({ success: false, message: "未授權" }, { status: 401 })
    );

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).not.toHaveProperty("data");
    expect(json.data).toBeUndefined();
    expect(JSON.stringify(json)).not.toMatch(/total/i);
    expect(newsletterQueries.listSubscribers).not.toHaveBeenCalled();
  });

  it("returns 403 with no data/total for an EDITOR session lacking the permission", async () => {
    (requirePermission as any).mockResolvedValue(
      Response.json({ success: false, message: "禁止存取" }, { status: 403 })
    );

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.data).toBeUndefined();
    expect(newsletterQueries.listSubscribers).not.toHaveBeenCalled();
  });

  it("returns bounded, safe-DTO items with total/page/pageSize on success", async () => {
    (requirePermission as any).mockResolvedValue(null);
    const createdAt = new Date("2026-01-01T00:00:00Z");
    // use case 現在回傳實際生效（已夾限）的 page / pageSize，route 依此誠實回傳
    (newsletterQueries.listSubscribers as any).mockResolvedValue({
      items: [{ id: "s1", name: "Reader", email: "reader@example.com", createdAt }],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const res = await GET(makeRequest("?page=1&pageSize=10"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.items).toEqual([{ id: "s1", name: "Reader", email: "reader@example.com", createdAt: createdAt.toISOString() }]);
    expect(json.data.total).toBe(1);
    expect(json.data.page).toBe(1);
    expect(json.data.pageSize).toBe(10);
  });

  it("echoes the use case's effective (clamped) pageSize, not the oversized requested value", async () => {
    (requirePermission as any).mockResolvedValue(null);
    // 請求 pageSize=9999，use case 夾限為 50 並回傳生效值
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 });

    const res = await GET(makeRequest("?page=1&pageSize=9999"));
    const json = await res.json();

    expect(json.data.pageSize).toBe(50);
  });

  it("passes a trimmed search term through to the use case", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0 });

    await GET(makeRequest("?q=%20%20reader%40example.com%20%20"));

    expect(newsletterQueries.listSubscribers).toHaveBeenCalledWith(
      expect.objectContaining({ search: "reader@example.com" })
    );
  });

  it("omits the search term entirely when q is blank", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0 });

    await GET(makeRequest("?q=%20%20"));

    expect(newsletterQueries.listSubscribers).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined })
    );
  });

  it("truncates an oversized search term to 200 characters before passing it through", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0 });

    const oversized = "a".repeat(500);
    await GET(makeRequest(`?q=${oversized}`));

    expect(newsletterQueries.listSubscribers).toHaveBeenCalledWith(
      expect.objectContaining({ search: "a".repeat(200) })
    );
  });

  it("falls back to page 1 / default pageSize 20 for missing or invalid pagination params", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0 });

    await GET(makeRequest("?page=not-a-number&pageSize=-5"));

    expect(newsletterQueries.listSubscribers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 })
    );
  });

  it("returns an empty result shape when there are no matching subscribers", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0 });

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.items).toEqual([]);
    expect(json.data.total).toBe(0);
  });

  it("returns a generic 500 without leaking internals when the use case throws", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockRejectedValue(new Error("db connection string leaked"));

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.message).not.toMatch(/db connection string/);
  });

  it("rejects page values with trailing junk (e.g. 1junk) instead of lenient parseInt parsing", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0 });

    // 若採寬鬆 parseInt，會被解析為 page=2 / pageSize=30；嚴格驗證必須整串為十進位數字
    await GET(makeRequest("?page=2junk&pageSize=30abc"));

    expect(newsletterQueries.listSubscribers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 })
    );
  });

  it("sets Cache-Control: private, no-store on successful PII responses", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    const res = await GET(makeRequest());

    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("sets Cache-Control: private, no-store on auth-error responses", async () => {
    (requirePermission as any).mockResolvedValue(
      Response.json({ success: false, message: "未授權" }, { status: 401 })
    );

    const res = await GET(makeRequest());

    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("sets Cache-Control: private, no-store on internal-error responses", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (newsletterQueries.listSubscribers as any).mockRejectedValue(new Error("boom"));

    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("logs unexpected errors redacted: no error message or stack reaches the log", async () => {
    // PII 相鄰 route：DB 錯誤字串可能含連線資訊或個資，日誌只保留泛化錯誤碼
    (requirePermission as any).mockResolvedValue(null);
    const dbError = new Error("connection to db://user:secret@host failed for ada@example.com");
    (newsletterQueries.listSubscribers as any).mockRejectedValue(dbError);

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    const logged = JSON.stringify((logger.error as any).mock.calls);
    expect(logged).not.toContain("secret@host");
    expect(logged).not.toContain("ada@example.com");
    expect(logged).not.toContain("stack");
  });
});
