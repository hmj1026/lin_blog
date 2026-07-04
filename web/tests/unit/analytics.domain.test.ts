import { describe, it, expect } from "vitest";
import { clampInt, isDeviceType } from "@/modules/analytics/domain";

describe("analytics domain", () => {
  it("clampInt() clamps to range and normalizes floats", () => {
    expect(clampInt(0, 1, 10)).toBe(1);
    expect(clampInt(11, 1, 10)).toBe(10);
    expect(clampInt(3.9, 1, 10)).toBe(3);
  });

  it("clampInt(days, 1, 90) 將缺省/非數值/0/負數/超出上限的 days 收斂至 [1, 90] 區間", () => {
    // 非數值（例如 query string 解析失敗的 NaN）視為缺省，回傳下限 1
    expect(clampInt(NaN, 1, 90)).toBe(1);
    expect(clampInt(0, 1, 90)).toBe(1);
    expect(clampInt(-5, 1, 90)).toBe(1);
    expect(clampInt(9999, 1, 90)).toBe(90);
    expect(clampInt(7, 1, 90)).toBe(7);
  });

  it("isDeviceType() recognizes allowed values", () => {
    expect(isDeviceType("MOBILE")).toBe(true);
    expect(isDeviceType("NOPE")).toBe(false);
  });
});

