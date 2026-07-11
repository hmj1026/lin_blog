import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/newsletter/subscribe/route";
import { newsletterUseCases } from "@/modules/newsletter";
import { logger } from "@/lib/logger";

vi.mock("@/modules/newsletter", () => ({
  newsletterUseCases: {
    subscribe: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const CAPTCHA_TOKEN = "captcha-token-should-never-be-logged";
const FULL_NAME = "Full Reader Name";
const FULL_EMAIL = "reader@example.com";
const RAW_IP = "203.0.113.42";

function makeRequest(overrides: Partial<{ name: string; email: string; captchaToken: string }> = {}) {
  return new Request("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": RAW_IP,
    },
    body: JSON.stringify({ name: FULL_NAME, email: FULL_EMAIL, captchaToken: CAPTCHA_TOKEN, ...overrides }),
  }) as any;
}

function allLoggedContexts() {
  const calls = [
    ...(logger.error as any).mock.calls,
    ...(logger.warn as any).mock.calls,
    ...(logger.info as any).mock.calls,
    ...(logger.debug as any).mock.calls,
  ];
  return calls.map((call) => JSON.stringify(call));
}

describe("POST /api/newsletter/subscribe — observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs a success result including a request id, without sensitive fields", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });

    await POST(makeRequest());

    expect(logger.info).toHaveBeenCalled();
    const serialized = allLoggedContexts().join("\n");
    expect(serialized).toMatch(/requestId/);
    expect(serialized).not.toContain(CAPTCHA_TOKEN);
    expect(serialized).not.toContain(FULL_NAME);
    expect(serialized).not.toContain(FULL_EMAIL);
    expect(serialized).not.toContain(RAW_IP);
  });

  it("logs a duplicate result (same generic use-case result type) without sensitive fields", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });

    await POST(makeRequest());

    const serialized = allLoggedContexts().join("\n");
    expect(serialized).not.toContain(FULL_EMAIL);
    expect(serialized).not.toContain(CAPTCHA_TOKEN);
  });

  it("logs a validation-failure result without sensitive fields", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({
      status: "invalid",
      errors: { email: "Email 格式不正確" },
    });

    await POST(makeRequest());

    const serialized = allLoggedContexts().join("\n");
    expect(serialized).not.toContain(FULL_EMAIL);
    expect(serialized).not.toContain(FULL_NAME);
    expect(serialized).not.toContain(CAPTCHA_TOKEN);
  });

  it("logs a provider/captcha-error result without sensitive fields", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "captcha-failed" });

    await POST(makeRequest());

    const serialized = allLoggedContexts().join("\n");
    expect(serialized).not.toContain(FULL_EMAIL);
    expect(serialized).not.toContain(CAPTCHA_TOKEN);
    expect(serialized).not.toContain(RAW_IP);
  });

  it("never logs the raw client IP even though it is used to derive the rate-limit source key", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });

    await POST(makeRequest());

    expect(newsletterUseCases.subscribe).toHaveBeenCalledWith(expect.objectContaining({ sourceKey: RAW_IP }));
    const serialized = allLoggedContexts().join("\n");
    expect(serialized).not.toContain(RAW_IP);
  });

  it("derives sourceKey from x-real-ip, not the spoofable first x-forwarded-for hop", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });

    const request = new Request("http://localhost/api/newsletter/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4, real",
        "x-real-ip": "9.9.9.9",
      },
      body: JSON.stringify({ name: FULL_NAME, email: FULL_EMAIL, captchaToken: CAPTCHA_TOKEN }),
    }) as any;

    await POST(request);

    expect(newsletterUseCases.subscribe).toHaveBeenCalledWith(expect.objectContaining({ sourceKey: "9.9.9.9" }));
  });

  it("falls back to the last x-forwarded-for segment (nginx-appended real IP) when x-real-ip is absent", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });

    const request = new Request("http://localhost/api/newsletter/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8, real",
      },
      body: JSON.stringify({ name: FULL_NAME, email: FULL_EMAIL, captchaToken: CAPTCHA_TOKEN }),
    }) as any;

    await POST(request);

    expect(newsletterUseCases.subscribe).toHaveBeenCalledWith(expect.objectContaining({ sourceKey: "real" }));
  });

  it("trims a trailing-comma x-forwarded-for segment instead of falling through to unknown", async () => {
    (newsletterUseCases.subscribe as any).mockResolvedValue({ status: "subscribed" });

    const request = new Request("http://localhost/api/newsletter/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4,",
      },
      body: JSON.stringify({ name: FULL_NAME, email: FULL_EMAIL, captchaToken: CAPTCHA_TOKEN }),
    }) as any;

    await POST(request);

    expect(newsletterUseCases.subscribe).toHaveBeenCalledWith(expect.objectContaining({ sourceKey: "1.2.3.4" }));
  });

  it("includes a request id and a generic error code on unexpected exceptions, without the exception message", async () => {
    (newsletterUseCases.subscribe as any).mockRejectedValue(new Error("leaked-internal-detail"));

    await POST(makeRequest());

    expect(logger.error).toHaveBeenCalled();
    const serialized = allLoggedContexts().join("\n");
    expect(serialized).toMatch(/requestId/);
    expect(serialized).not.toContain("leaked-internal-detail");
  });
});
