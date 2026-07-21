import { describe, expect, it } from "vitest";

import { getApiErrorMessage, isApiSuccess } from "@/lib/api-client";

describe("api-client helpers", () => {
  it("isApiSuccess requires both res.ok and json.success", () => {
    expect(isApiSuccess({ ok: true } as Response, { success: true, data: 1 })).toBe(true);
    expect(isApiSuccess({ ok: false } as Response, { success: true, data: 1 })).toBe(false);
    expect(isApiSuccess({ ok: true } as Response, { success: false })).toBe(false);
  });

  it("getApiErrorMessage returns the server message, else the fallback", () => {
    expect(getApiErrorMessage({ success: false, message: "伺服器錯誤" }, "新增失敗")).toBe("伺服器錯誤");
    expect(getApiErrorMessage({ success: false }, "新增失敗")).toBe("新增失敗");
  });

  it("never yields an empty message even on an anomalous success envelope", () => {
    // 非 2xx 卻回 success:true 的異常 envelope：仍回傳 fallback，避免拋出空訊息的 Error。
    expect(getApiErrorMessage({ success: true, data: 1 }, "新增失敗")).toBe("新增失敗");
  });
});
