import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/users/route";
import { PUT, DELETE } from "@/app/api/users/[id]/route";
import { securityAdminUseCases } from "@/modules/security-admin";
import { requirePermission } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

vi.mock("@/lib/server/audit-safe", () => ({ recordAuditEventSafely: vi.fn().mockResolvedValue(true) }));

// Mock dependencies
vi.mock("@/modules/security-admin", () => ({
  securityAdminUseCases: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    softDeleteUser: vi.fn(),
    getUserAuthSnapshot: vi.fn(),
  },
}));

vi.mock("@/modules/security-admin/presentation/dto", () => ({
  toUserAdminRowDto: vi.fn((user) => ({ ...user, dto: true })),
}));

vi.mock("@/lib/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-utils")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

describe("API: /api/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (securityAdminUseCases.getUserAuthSnapshot as any).mockResolvedValue({ roleId: "editor" });
  });

  describe("GET", () => {
    it("returns users when authorized", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const mockUsers = [{ id: "1", email: "test@example.com" }];
      (securityAdminUseCases.listUsers as any).mockResolvedValue(mockUsers);

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data[0].dto).toBe(true);
      expect(securityAdminUseCases.listUsers).toHaveBeenCalled();
    });

    it("returns error when unauthorized", async () => {
      const errorResponse = NextResponse.json({ message: "Forbidden" }, { status: 403 });
      (requirePermission as any).mockResolvedValue(errorResponse);

      const response = await GET();
      expect(response.status).toBe(403);
      expect(securityAdminUseCases.listUsers).not.toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("creates user when authorized", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const mockUser = { id: "1", email: "new@example.com" };
      (securityAdminUseCases.createUser as any).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com" }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data.id).toBe("1");
      expect(securityAdminUseCases.createUser).toHaveBeenCalled();
    });
  });
});

describe("API: /api/users/[id]", () => {
  const context = { params: Promise.resolve({ id: "1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as any).mockResolvedValue({ user: { id: "admin-1" } });
  });

  describe("PUT", () => {
    it("updates user when authorized", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const mockUser = { id: "1", email: "updated@example.com" };
      (securityAdminUseCases.updateUser as any).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/users/1", {
        method: "PUT",
        body: JSON.stringify({ email: "updated@example.com" }),
      });

      const response = await PUT(request, context);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(securityAdminUseCases.updateUser).toHaveBeenCalledWith("1", expect.anything());
    });

    it("audits only fields that actually changed and surfaces password resets", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (securityAdminUseCases.getUserAuthSnapshot as any).mockResolvedValue({
        email: "same@example.com",
        name: "Same",
        roleId: "role-editor",
      });
      (securityAdminUseCases.updateUser as any).mockResolvedValue({
        id: "1",
        email: "same@example.com",
        name: "Same",
        roleId: "role-admin",
      });

      const request = new Request("http://localhost/api/users/1", {
        method: "PUT",
        body: JSON.stringify({ email: "same@example.com", name: "Same", roleId: "role-admin", password: "new-password" }),
      });
      await PUT(request, context);

      expect(recordAuditEventSafely).toHaveBeenCalledWith(expect.objectContaining({
        action: "user.updated",
        resourceType: "user",
        resourceId: "1",
        summary: expect.objectContaining({
          changedFields: ["roleId", "password"],
          fromRoleId: "role-editor",
          toRoleId: "role-admin",
        }),
      }));
    });
  });

  describe("DELETE", () => {
    it("deletes user when authorized", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const mockUser = { id: "1", deletedAt: new Date() };
      (securityAdminUseCases.softDeleteUser as any).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/users/1", {
        method: "DELETE",
      });

      const response = await DELETE(request, context);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(securityAdminUseCases.softDeleteUser).toHaveBeenCalledWith("1", { actorId: "admin-1" });
    });
  });
});
