import { describe, it, expect } from "vitest";
import { validateSubscriberInput } from "@/modules/newsletter/domain";

describe("newsletter domain: validateSubscriberInput()", () => {
  it("accepts a valid name and email, trimming and lowercasing the email", () => {
    const result = validateSubscriberInput({ name: "Reader", email: " Reader@Example.COM " });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.name).toBe("Reader");
    expect(result.value.email).toBe("reader@example.com");
  });

  it("trims surrounding whitespace from the name", () => {
    const result = validateSubscriberInput({ name: "  Reader  ", email: "reader@example.com" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.value.name).toBe("Reader");
  });

  it("rejects an empty name", () => {
    const result = validateSubscriberInput({ name: "", email: "reader@example.com" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.errors.name).toBeDefined();
  });

  it("rejects a whitespace-only name", () => {
    const result = validateSubscriberInput({ name: "   ", email: "reader@example.com" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.errors.name).toBeDefined();
  });

  it("rejects a name longer than the maximum allowed length", () => {
    const result = validateSubscriberInput({ name: "a".repeat(101), email: "reader@example.com" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.errors.name).toBeDefined();
  });

  it("rejects an empty email", () => {
    const result = validateSubscriberInput({ name: "Reader", email: "" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.errors.email).toBeDefined();
  });

  it("rejects a malformed email", () => {
    const result = validateSubscriberInput({ name: "Reader", email: "not-an-email" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.errors.email).toBeDefined();
  });

  it("rejects an email longer than the maximum allowed length", () => {
    const longLocalPart = "a".repeat(250);
    const result = validateSubscriberInput({ name: "Reader", email: `${longLocalPart}@example.com` });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.errors.email).toBeDefined();
  });

  it("reports both field errors when both are invalid", () => {
    const result = validateSubscriberInput({ name: "", email: "not-an-email" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected invalid result");
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
  });

  it("returns a typed invalid result (not a thrown error) when name is null/undefined at runtime", () => {
    const nullName = null as unknown as string;
    const undefinedName = undefined as unknown as string;

    expect(() => validateSubscriberInput({ name: nullName, email: "reader@example.com" })).not.toThrow();
    const nullResult = validateSubscriberInput({ name: nullName, email: "reader@example.com" });
    expect(nullResult.ok).toBe(false);
    if (nullResult.ok) throw new Error("expected invalid result");
    expect(nullResult.errors.name).toBeDefined();

    const undefinedResult = validateSubscriberInput({ name: undefinedName, email: "reader@example.com" });
    expect(undefinedResult.ok).toBe(false);
    if (undefinedResult.ok) throw new Error("expected invalid result");
    expect(undefinedResult.errors.name).toBeDefined();
  });

  it("returns a typed invalid result (not a thrown error) when email is null/undefined at runtime", () => {
    const nullEmail = null as unknown as string;
    const undefinedEmail = undefined as unknown as string;

    expect(() => validateSubscriberInput({ name: "Reader", email: nullEmail })).not.toThrow();
    const nullResult = validateSubscriberInput({ name: "Reader", email: nullEmail });
    expect(nullResult.ok).toBe(false);
    if (nullResult.ok) throw new Error("expected invalid result");
    expect(nullResult.errors.email).toBeDefined();

    const undefinedResult = validateSubscriberInput({ name: "Reader", email: undefinedEmail });
    expect(undefinedResult.ok).toBe(false);
    if (undefinedResult.ok) throw new Error("expected invalid result");
    expect(undefinedResult.errors.email).toBeDefined();
  });

  it("returns an immutable value object", () => {
    const result = validateSubscriberInput({ name: "Reader", email: "reader@example.com" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(() => {
      // @ts-expect-error intentional mutation attempt against a readonly value
      result.value.email = "attacker@example.com";
    }).toThrow();
    expect(result.value.email).toBe("reader@example.com");
  });
});
