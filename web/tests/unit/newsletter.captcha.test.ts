import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveRecaptchaConfig } from "@/modules/newsletter/infrastructure/captcha/config";
import {
  createRecaptchaVerifier,
  RECAPTCHA_VERIFY_TIMEOUT_MS,
} from "@/modules/newsletter/infrastructure/captcha/recaptcha.adapter";
import {
  createCaptchaTestDoubleVerifier,
  isCaptchaTestDoubleEnabled,
} from "@/modules/newsletter/infrastructure/captcha/test-double";

const SECRET = "s3cr3t-value-should-never-leak";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("resolveRecaptchaConfig", () => {
  it("returns a config object when secret, site key and hostnames are all present", () => {
    const config = resolveRecaptchaConfig({
      secretKey: SECRET,
      siteKey: "site-key",
      allowedHostnames: "example.com, www.example.com",
    });

    expect(config).toEqual({
      secretKey: SECRET,
      allowedHostnames: ["example.com", "www.example.com"],
    });
  });

  it("returns null (fail closed) when the secret key is missing", () => {
    const config = resolveRecaptchaConfig({
      siteKey: "site-key",
      allowedHostnames: "example.com",
    });

    expect(config).toBeNull();
  });

  it("returns null (fail closed) when the site key is missing", () => {
    const config = resolveRecaptchaConfig({
      secretKey: SECRET,
      allowedHostnames: "example.com",
    });

    expect(config).toBeNull();
  });

  it("returns null (fail closed) when allowed hostnames are missing", () => {
    const config = resolveRecaptchaConfig({
      secretKey: SECRET,
      siteKey: "site-key",
    });

    expect(config).toBeNull();
  });

  it("returns null (fail closed) when allowed hostnames is an empty/whitespace-only string", () => {
    const config = resolveRecaptchaConfig({
      secretKey: SECRET,
      siteKey: "site-key",
      allowedHostnames: "   ,  ,",
    });

    expect(config).toBeNull();
  });

  it("never lets the secret leak into a JSON-serialized failure result", () => {
    const config = resolveRecaptchaConfig({ siteKey: "site-key", allowedHostnames: "example.com" });

    expect(JSON.stringify(config)).not.toContain(SECRET);
  });
});

describe("createRecaptchaVerifier", () => {
  const config = { secretKey: SECRET, allowedHostnames: ["example.com"] };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails closed with 'not-configured' and never calls fetch when config is null", async () => {
    const verifier = createRecaptchaVerifier(null);

    const result = await verifier.verify("some-token");

    expect(result).toEqual({ ok: false, reason: "not-configured" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed with 'missing-token' and never calls fetch when token is null", async () => {
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify(null);

    expect(result).toEqual({ ok: false, reason: "missing-token" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed with 'missing-token' and never calls fetch when token is undefined", async () => {
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify(undefined);

    expect(result).toEqual({ ok: false, reason: "missing-token" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed with 'missing-token' and never calls fetch when token is an empty string", async () => {
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("");

    expect(result).toEqual({ ok: false, reason: "missing-token" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns ok:true when Google reports success and an allowed hostname", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true, hostname: "example.com" }));
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("valid-token", { hostname: "example.com" });

    expect(result).toEqual({ ok: true });
  });

  it("calls fetch with a bounded timeout signal", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true, hostname: "example.com" }));
    const verifier = createRecaptchaVerifier(config);

    await verifier.verify("valid-token");

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("fails closed with 'invalid-token' when Google reports success:false", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }));
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("expired-token");

    expect(result).toEqual({ ok: false, reason: "invalid-token" });
  });

  it("fails closed with 'hostname-mismatch' when the verified hostname is not in the allowlist", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true, hostname: "evil.example" }));
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("valid-token");

    expect(result).toEqual({ ok: false, reason: "hostname-mismatch" });
  });

  it("fails closed with 'hostname-mismatch' when the caller-supplied hostname disagrees with Google's response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true, hostname: "example.com" }));
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("valid-token", { hostname: "other.example" });

    expect(result).toEqual({ ok: false, reason: "hostname-mismatch" });
  });

  it("fails closed with a generic 'provider-error' when fetch rejects (timeout/network)", async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException("The operation was aborted", "AbortError"));
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("valid-token");

    expect(result).toEqual({ ok: false, reason: "provider-error" });
  });

  it("fails closed with a generic 'provider-error' on a 5xx response", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false, 503));
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("valid-token");

    expect(result).toEqual({ ok: false, reason: "provider-error" });
  });

  it("fails closed with a generic 'provider-error' on malformed JSON", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token in JSON");
      },
    } as unknown as Response);
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("valid-token");

    expect(result).toEqual({ ok: false, reason: "provider-error" });
  });

  it("exposes a bounded default timeout constant of 5 seconds", () => {
    expect(RECAPTCHA_VERIFY_TIMEOUT_MS).toBe(5000);
  });

  it("never lets the secret appear in a JSON-serialized failure result", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: false }));
    const verifier = createRecaptchaVerifier(config);

    const result = await verifier.verify("bad-token");

    expect(JSON.stringify(result)).not.toContain(SECRET);
  });
});

describe("isCaptchaTestDoubleEnabled (fail closed in production)", () => {
  it("returns false when NODE_ENV is production, even if the flag is '1'", () => {
    expect(
      isCaptchaTestDoubleEnabled({ NEWSLETTER_CAPTCHA_TEST_DOUBLE: "1", NODE_ENV: "production" })
    ).toBe(false);
  });

  it("returns true when the flag is '1' and NODE_ENV is development", () => {
    expect(
      isCaptchaTestDoubleEnabled({ NEWSLETTER_CAPTCHA_TEST_DOUBLE: "1", NODE_ENV: "development" })
    ).toBe(true);
  });

  it("returns true when the flag is '1' and NODE_ENV is test", () => {
    expect(isCaptchaTestDoubleEnabled({ NEWSLETTER_CAPTCHA_TEST_DOUBLE: "1", NODE_ENV: "test" })).toBe(true);
  });

  it("returns false when the flag is absent, regardless of NODE_ENV", () => {
    expect(isCaptchaTestDoubleEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isCaptchaTestDoubleEnabled({})).toBe(false);
  });

  it("returns false when the flag has any value other than the literal '1'", () => {
    expect(
      isCaptchaTestDoubleEnabled({ NEWSLETTER_CAPTCHA_TEST_DOUBLE: "true", NODE_ENV: "development" })
    ).toBe(false);
  });
});

describe("createCaptchaTestDoubleVerifier", () => {
  const verifier = createCaptchaTestDoubleVerifier();

  it("returns ok:true for the 'e2e-pass' token", async () => {
    expect(await verifier.verify("e2e-pass")).toEqual({ ok: true });
  });

  it("returns 'invalid-token' for the 'e2e-expired' token", async () => {
    expect(await verifier.verify("e2e-expired")).toEqual({ ok: false, reason: "invalid-token" });
  });

  it("returns 'provider-error' for the 'e2e-provider-error' token", async () => {
    expect(await verifier.verify("e2e-provider-error")).toEqual({ ok: false, reason: "provider-error" });
  });

  it("returns 'invalid-token' for any other unrecognized token", async () => {
    expect(await verifier.verify("some-random-token")).toEqual({ ok: false, reason: "invalid-token" });
  });

  it("returns 'missing-token' when the token is null/undefined/empty", async () => {
    expect(await verifier.verify(null)).toEqual({ ok: false, reason: "missing-token" });
    expect(await verifier.verify(undefined)).toEqual({ ok: false, reason: "missing-token" });
    expect(await verifier.verify("")).toEqual({ ok: false, reason: "missing-token" });
  });
});
