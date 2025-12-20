import { describe, it, expect } from "vitest";
import { clampInt, isDeviceType } from "@/modules/analytics/domain";

describe("analytics domain", () => {
  it("clampInt() clamps to range and normalizes floats", () => {
    expect(clampInt(0, 1, 10)).toBe(1);
    expect(clampInt(11, 1, 10)).toBe(10);
    expect(clampInt(3.9, 1, 10)).toBe(3);
  });

  it("isDeviceType() recognizes allowed values", () => {
    expect(isDeviceType("MOBILE")).toBe(true);
    expect(isDeviceType("NOPE")).toBe(false);
  });
});

