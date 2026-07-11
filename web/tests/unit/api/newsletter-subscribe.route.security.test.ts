import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/newsletter/subscribe/route";
import { newsletterUseCases } from "@/modules/newsletter";

vi.mock("@/modules/newsletter", () => ({
  newsletterUseCases: {
    subscribe: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const SECRET_EMAIL = "secret-reader@example.com";
const FORBIDDEN_WORDS = /already|exists|duplicate|已存在|重複|已訂閱/i;
const MARKER = "SUPER-SECRET-DB-CONNECTION-STRING-MARKER-42";

function makeRequest(body: unknown = { name: "Reader", email: SECRET_EMAIL, captchaToken: "token-123" }) {
  return new Request("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

async function bodyOf(res: Response) {
  return res.text();
}

describe("POST /api/newsletter/subscribe — security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("400 response for invalid input does not echo the submitted email", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({
      status: "invalid",
      errors: { email: "Email 格式不正確" },
    });

    const res = await POST(makeRequest());
    const text = await bodyOf(res);

    expect(res.status).toBe(400);
    expect(text).not.toContain(SECRET_EMAIL);
  });

  it("400 response for captcha failure contains no duplicate/exists wording", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "captcha-failed" });

    const res = await POST(makeRequest());
    const text = await bodyOf(res);

    expect(res.status).toBe(400);
    expect(text).not.toMatch(FORBIDDEN_WORDS);
    expect(text).not.toContain(SECRET_EMAIL);
  });

  it("429 response contains no duplicate/exists wording and no email echo", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "rate-limited", retryAfterSeconds: 10 });

    const res = await POST(makeRequest());
    const text = await bodyOf(res);

    expect(res.status).toBe(429);
    expect(text).not.toMatch(FORBIDDEN_WORDS);
    expect(text).not.toContain(SECRET_EMAIL);
  });

  it("500 response for an unexpected use-case exception does not leak the exception message", async () => {
    (newsletterUseCases.subscribe as any).mockRejectedValue(new Error(MARKER));

    const res = await POST(makeRequest());
    const text = await bodyOf(res);

    expect(res.status).toBe(500);
    expect(text).not.toContain(MARKER);
  });

  it("500 response for an unexpected use-case exception does not leak it into logs either", async () => {
    const { logger } = await import("@/lib/logger");
    (newsletterUseCases.subscribe as any).mockRejectedValue(new Error(MARKER));

    await POST(makeRequest());

    const allLogCalls = [
      ...(logger.error as any).mock.calls,
      ...(logger.warn as any).mock.calls,
      ...(logger.info as any).mock.calls,
      ...(logger.debug as any).mock.calls,
    ];
    const serialized = JSON.stringify(allLogCalls);
    expect(serialized).not.toContain(MARKER);
  });

  it("success and duplicate responses are byte-identical (JSON.stringify equality)", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });
    const first = await POST(makeRequest());
    const firstJson = await first.json();

    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });
    const second = await POST(makeRequest());
    const secondJson = await second.json();

    expect(JSON.stringify(secondJson)).toBe(JSON.stringify(firstJson));
  });

  it("Retry-After header is present only on the 429 response, not on 200/400/500", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });
    const ok = await POST(makeRequest());
    expect(ok.headers.get("Retry-After")).toBeNull();

    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "captcha-failed" });
    const bad = await POST(makeRequest());
    expect(bad.headers.get("Retry-After")).toBeNull();

    (newsletterUseCases.subscribe as any).mockRejectedValue(new Error(MARKER));
    const err = await POST(makeRequest());
    expect(err.headers.get("Retry-After")).toBeNull();

    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "rate-limited", retryAfterSeconds: 7 });
    const limited = await POST(makeRequest());
    expect(limited.headers.get("Retry-After")).toBe("7");
  });
});
