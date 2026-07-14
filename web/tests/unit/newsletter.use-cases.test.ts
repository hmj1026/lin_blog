import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNewsletterUseCases } from "@/modules/newsletter/application/use-cases";

describe("newsletter use cases: subscribe()", () => {
  const writeRepo = {
    findByEmail: vi.fn(),
    create: vi.fn(),
  };
  const captchaVerifier = {
    verify: vi.fn(),
  };
  const rateLimiter = {
    check: vi.fn(),
  };

  const useCases = createNewsletterUseCases({ writeRepo, captchaVerifier, rateLimiter });

  const validInput = {
    name: "Reader",
    email: "reader@example.com",
    captchaToken: "valid-token",
    sourceKey: "hashed-source",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter.check.mockResolvedValue({ allowed: true });
    captchaVerifier.verify.mockResolvedValue({ ok: true });
    writeRepo.findByEmail.mockResolvedValue(null);
    writeRepo.create.mockResolvedValue({
      outcome: "created",
      subscriber: { id: "sub-1", name: "Reader", email: "reader@example.com", createdAt: new Date() },
    });
  });

  it("persists a new subscriber through the repository port", async () => {
    const result = await useCases.subscribe(validInput);

    expect(writeRepo.create).toHaveBeenCalledWith({ name: "Reader", email: "reader@example.com" });
    expect(result.status).toBe("subscribed");
  });

  it("returns invalid with field errors and never checks rate limit/captcha/repo when input is invalid", async () => {
    const result = await useCases.subscribe({ ...validInput, name: "", email: "not-an-email" });

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("expected invalid result");
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(rateLimiter.check).not.toHaveBeenCalled();
    expect(captchaVerifier.verify).not.toHaveBeenCalled();
    expect(writeRepo.findByEmail).not.toHaveBeenCalled();
    expect(writeRepo.create).not.toHaveBeenCalled();
  });

  it("returns a typed invalid result (not a thrown error) when name/email are null/undefined at runtime", async () => {
    const runtimeInput = { ...validInput, name: undefined as unknown as string, email: null as unknown as string };

    const result = await useCases.subscribe(runtimeInput);

    expect(result.status).toBe("invalid");
    expect(rateLimiter.check).not.toHaveBeenCalled();
    expect(captchaVerifier.verify).not.toHaveBeenCalled();
    expect(writeRepo.create).not.toHaveBeenCalled();
  });

  it("returns the rate-limited result and never calls captcha or the repository", async () => {
    rateLimiter.check.mockResolvedValue({ allowed: false, retryAfterSeconds: 42 });

    const result = await useCases.subscribe(validInput);

    expect(result.status).toBe("rate-limited");
    if (result.status !== "rate-limited") throw new Error("expected rate-limited result");
    expect(result.retryAfterSeconds).toBe(42);
    expect(captchaVerifier.verify).not.toHaveBeenCalled();
    expect(writeRepo.create).not.toHaveBeenCalled();
  });

  it("checks the rate limiter before the captcha verifier", async () => {
    await useCases.subscribe(validInput);

    const rateLimitOrder = rateLimiter.check.mock.invocationCallOrder[0];
    const captchaOrder = captchaVerifier.verify.mock.invocationCallOrder[0];
    expect(rateLimitOrder).toBeLessThan(captchaOrder);
  });

  it("returns a generic recoverable error on captcha failure and never touches the repository", async () => {
    captchaVerifier.verify.mockResolvedValue({ ok: false, reason: "invalid-token" });

    const result = await useCases.subscribe(validInput);

    expect(result.status).toBe("captcha-failed");
    expect(writeRepo.findByEmail).not.toHaveBeenCalled();
    expect(writeRepo.create).not.toHaveBeenCalled();
  });

  it("propagates the specific captcha failure reason for diagnosability, without changing the generic client-facing status", async () => {
    captchaVerifier.verify.mockResolvedValue({ ok: false, reason: "hostname-mismatch" });

    const result = await useCases.subscribe(validInput);

    expect(result.status).toBe("captcha-failed");
    if (result.status !== "captcha-failed") throw new Error("expected captcha-failed result");
    expect(result.reason).toBe("hostname-mismatch");
  });

  it("returns the same generic success result for a duplicate email without updating the existing name, via a single create() call mapping the conflict outcome", async () => {
    writeRepo.create.mockResolvedValue({ outcome: "conflict" });

    const result = await useCases.subscribe({ ...validInput, name: "New Name" });

    expect(result.status).toBe("subscribed");
    expect(writeRepo.create).toHaveBeenCalledTimes(1);
    expect(writeRepo.create).toHaveBeenCalledWith({ name: "New Name", email: "reader@example.com" });
    expect(writeRepo.findByEmail).not.toHaveBeenCalled();
  });

  it("normalizes case and whitespace variants of an email before calling create(), on the duplicate (conflict) path", async () => {
    writeRepo.create.mockResolvedValue({ outcome: "conflict" });

    const result = await useCases.subscribe({ ...validInput, email: " Reader@Example.com " });

    expect(writeRepo.create).toHaveBeenCalledWith({ name: "Reader", email: "reader@example.com" });
    expect(writeRepo.findByEmail).not.toHaveBeenCalled();
    expect(result.status).toBe("subscribed");
  });

  it("maps a raced unique-conflict from the repository to the identical generic success result", async () => {
    const firstTimeResult = await useCases.subscribe(validInput);

    writeRepo.create.mockResolvedValue({ outcome: "conflict" });
    const racedResult = await useCases.subscribe(validInput);

    expect(racedResult.status).toBe("subscribed");
    expect(racedResult).toEqual(firstTimeResult);
  });

  it("performs exactly one repository call on both the new-subscriber and duplicate-email paths (no timing oracle via call-count difference)", async () => {
    writeRepo.create.mockResolvedValueOnce({
      outcome: "created",
      subscriber: { id: "sub-1", name: "Reader", email: "reader@example.com", createdAt: new Date() },
    });
    await useCases.subscribe(validInput);
    const newSubscriberCallCount = writeRepo.findByEmail.mock.calls.length + writeRepo.create.mock.calls.length;

    vi.clearAllMocks();
    rateLimiter.check.mockResolvedValue({ allowed: true });
    captchaVerifier.verify.mockResolvedValue({ ok: true });
    writeRepo.create.mockResolvedValueOnce({ outcome: "conflict" });
    await useCases.subscribe(validInput);
    const duplicateCallCount = writeRepo.findByEmail.mock.calls.length + writeRepo.create.mock.calls.length;

    expect(newSubscriberCallCount).toBe(1);
    expect(duplicateCallCount).toBe(1);
    expect(newSubscriberCallCount).toBe(duplicateCallCount);
  });
});

describe("newsletter use cases: listSubscribers()", () => {
  const listRepo = {
    list: vi.fn(),
  };
  const writeRepo = { findByEmail: vi.fn(), create: vi.fn() };
  const captchaVerifier = { verify: vi.fn() };
  const rateLimiter = { check: vi.fn() };

  const useCases = createNewsletterUseCases({ writeRepo, captchaVerifier, rateLimiter, listRepo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the repository with bounded, defaulted pagination", async () => {
    listRepo.list.mockResolvedValue({ items: [], total: 0 });

    await useCases.listSubscribers({});

    expect(listRepo.list).toHaveBeenCalledWith({ search: undefined, page: 1, pageSize: 20 });
  });

  it("clamps page below 1 up to 1", async () => {
    listRepo.list.mockResolvedValue({ items: [], total: 0 });

    await useCases.listSubscribers({ page: -5 });

    expect(listRepo.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it("clamps page above the safety ceiling down to the ceiling, bounding the OFFSET", async () => {
    listRepo.list.mockResolvedValue({ items: [], total: 0 });

    await useCases.listSubscribers({ page: Number.MAX_SAFE_INTEGER });

    expect(listRepo.list).toHaveBeenCalledWith(expect.objectContaining({ page: 10000 }));
  });

  it("clamps pageSize above the maximum down to the maximum", async () => {
    listRepo.list.mockResolvedValue({ items: [], total: 0 });

    await useCases.listSubscribers({ pageSize: 9999 });

    expect(listRepo.list).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 50 }));
  });

  it("echoes the effective (clamped) page and pageSize in the result, not the requested values", async () => {
    listRepo.list.mockResolvedValue({ items: [], total: 0 });

    const result = await useCases.listSubscribers({ page: -5, pageSize: 9999 });

    // API 依此回傳誠實的分頁值，consumer 才能算出正確的頁數
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("trims the search term before passing it to the repository", async () => {
    listRepo.list.mockResolvedValue({ items: [], total: 0 });

    await useCases.listSubscribers({ search: "  reader  " });

    expect(listRepo.list).toHaveBeenCalledWith(expect.objectContaining({ search: "reader" }));
  });

  it("returns only the whitelisted subscriber DTO fields, dropping any extra repository data", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    listRepo.list.mockResolvedValue({
      items: [
        {
          id: "sub-1",
          name: "Reader",
          email: "reader@example.com",
          createdAt,
          // extra fields a leaking repository implementation might accidentally include
          captchaToken: "secret-token",
          sourceKeyHash: "hashed-ip",
          rateLimitBucket: "bucket-1",
        } as unknown as { id: string; name: string; email: string; createdAt: Date },
      ],
      total: 1,
    });

    const result = await useCases.listSubscribers({});

    expect(result.items).toEqual([{ id: "sub-1", name: "Reader", email: "reader@example.com", createdAt }]);
    expect(result.total).toBe(1);
    expect(Object.keys(result.items[0])).toEqual(["id", "name", "email", "createdAt"]);
  });
});
