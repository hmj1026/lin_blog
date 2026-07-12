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

function makeRequest(body: unknown, rawBody?: string) {
  return new Request("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rawBody ?? JSON.stringify(body),
  }) as any;
}

const VALID_BODY = { name: "Reader", email: "reader@example.com", captchaToken: "token-123" };

describe("POST /api/newsletter/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("schema validation", () => {
    it("returns 400 and does not call the use case when name is missing", async () => {
      const res = await POST(makeRequest({ email: VALID_BODY.email, captchaToken: VALID_BODY.captchaToken }));
      expect(res.status).toBe(400);
      expect(newsletterUseCases.subscribe).not.toHaveBeenCalled();
    });

    it("returns 400 and does not call the use case when email is not a string", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, email: 12345 }));
      expect(res.status).toBe(400);
      expect(newsletterUseCases.subscribe).not.toHaveBeenCalled();
    });

    it("returns 400 and does not call the use case when captchaToken is missing", async () => {
      const res = await POST(makeRequest({ name: VALID_BODY.name, email: VALID_BODY.email }));
      expect(res.status).toBe(400);
      expect(newsletterUseCases.subscribe).not.toHaveBeenCalled();
    });

    it("returns 400, not 500, for malformed JSON bodies", async () => {
      const res = await POST(makeRequest(undefined, "{not-json"));
      expect(res.status).toBe(400);
      expect(newsletterUseCases.subscribe).not.toHaveBeenCalled();
    });

    it("returns 400 and does not call the use case when fields exceed the domain length bounds", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, name: "a".repeat(101) }));
      expect(res.status).toBe(400);
      expect(newsletterUseCases.subscribe).not.toHaveBeenCalled();
    });

    it("returns 400 and does not call the use case when email exceeds the domain length bound", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, email: `${"a".repeat(250)}@a.com` }));
      expect(res.status).toBe(400);
      expect(newsletterUseCases.subscribe).not.toHaveBeenCalled();
    });

    it("returns 400 and does not call the use case when captchaToken exceeds the domain length bound", async () => {
      const res = await POST(makeRequest({ ...VALID_BODY, captchaToken: "a".repeat(4097) }));
      expect(res.status).toBe(400);
      expect(newsletterUseCases.subscribe).not.toHaveBeenCalled();
    });
  });

  describe("rate limiting", () => {
    it("returns 429 with a Retry-After header matching the use case's retryAfterSeconds", async () => {
      (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "rate-limited", retryAfterSeconds: 42 });

      const res = await POST(makeRequest(VALID_BODY));

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("42");
    });
  });

  describe("captcha failures", () => {
    it("returns 400 for a generic captcha failure", async () => {
      (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "captcha-failed" });

      const res = await POST(makeRequest(VALID_BODY));

      expect(res.status).toBe(400);
    });
  });

  describe("invalid business input", () => {
    it("returns 400 when the use case reports field validation errors", async () => {
      (newsletterUseCases.subscribe as any).mockResolvedValue({
        status: "invalid",
        errors: { email: "Email 格式不正確" },
      });

      const res = await POST(makeRequest(VALID_BODY));

      expect(res.status).toBe(400);
    });
  });

  describe("successful subscription", () => {
    it("returns 200 for a new subscription", async () => {
      (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });

      const res = await POST(makeRequest(VALID_BODY));

      expect(res.status).toBe(200);
    });

    it("returns 200 with a body byte-identical to the new-subscription case for a duplicate email", async () => {
      (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });
      const resNew = await POST(makeRequest(VALID_BODY));
      const bodyNew = await resNew.text();

      (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });
      const resDuplicate = await POST(makeRequest(VALID_BODY));
      const bodyDuplicate = await resDuplicate.text();

      expect(resDuplicate.status).toBe(200);
      expect(bodyDuplicate).toBe(bodyNew);
    });
  });
});
