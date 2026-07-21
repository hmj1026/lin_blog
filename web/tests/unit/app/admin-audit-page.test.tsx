import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac";
import { auditQueries } from "@/lib/server-queries";
import AdminAuditPage from "@/app/(admin)/admin/audit/page";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/rbac", () => ({ roleHasPermission: vi.fn() }));
vi.mock("@/lib/server-queries", () => ({ auditQueries: { listAuditEvents: vi.fn() } }));
vi.mock("@/components/pagination", () => ({ Pagination: () => <div>活動紀錄分頁</div> }));

describe("AdminAuditPage", () => {
  it("缺少 audit:view 時拒絕且不查詢資料", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { email: "editor@example.com", roleId: "editor" } } as never);
    vi.mocked(roleHasPermission).mockResolvedValue(false);
    render(await AdminAuditPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("無法存取此頁面")).toBeInTheDocument();
    expect(auditQueries.listAuditEvents).not.toHaveBeenCalled();
  });

  it("以 URL 日期、actor、resource 與 page 篩選並顯示安全摘要", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { email: "admin@example.com", roleId: "admin" } } as never);
    vi.mocked(roleHasPermission).mockResolvedValue(true);
    vi.mocked(auditQueries.listAuditEvents).mockResolvedValue({ total: 21, page: 2, pageSize: 20, totalPages: 2, items: [{ id: "event-1", actorId: "actor-1", action: "user.updated", resourceType: "user", resourceId: "user-1", summary: { fromRoleId: "editor", toRoleId: "admin" }, createdAt: new Date("2026-07-18T03:00:00.000Z") }] });
    render(await AdminAuditPage({ searchParams: Promise.resolve({ from: "2026-07-01", to: "2026-07-19", actor: "actor-1", resource: "user-1", page: "2" }) }));
    expect(auditQueries.listAuditEvents).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 20, actor: "actor-1", resource: "user-1", since: expect.any(Date), until: expect.any(Date) }));
    expect(screen.getByText("user.updated")).toBeInTheDocument();
    expect(screen.getByText("actor-1")).toBeInTheDocument();
    expect(screen.getByText(/fromRoleId.*editor/)).toBeInTheDocument();
    expect(screen.getByText("活動紀錄分頁")).toBeInTheDocument();
  });
});
