import { describe, expect, it } from "vitest";
import { sanitizeAuditSummary } from "@/modules/audit/domain/audit-summary";

describe("sanitizeAuditSummary", () => {
  it("只保留允許的非敏感摘要欄位與安全的變更欄位名稱", () => {
    expect(sanitizeAuditSummary({
      changedFields: ["roleId", "status", "password", "token", "content"],
      fromRoleId: "editor-role",
      toRoleId: "admin-role",
      password: "secret",
      token: "secret-token",
      content: "完整文章內容",
      email: "private@example.com",
    })).toEqual({
      // "password" 是允許的欄位「名稱」（僅記錄密碼曾被重設的事實）；密碼值本身仍被剔除。
      changedFields: ["roleId", "status", "password"],
      fromRoleId: "editor-role",
      toRoleId: "admin-role",
    });
  });

  it("限制字串、陣列與數值摘要的大小", () => {
    expect(sanitizeAuditSummary({
      scope: "x".repeat(500),
      affectedCount: 12,
      referenceIds: Array.from({ length: 30 }, (_, index) => `id-${index}`),
    })).toEqual({
      scope: "x".repeat(200),
      affectedCount: 12,
      referenceIds: Array.from({ length: 20 }, (_, index) => `id-${index}`),
    });
  });
});
