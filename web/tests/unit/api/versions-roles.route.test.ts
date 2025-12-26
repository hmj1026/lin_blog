import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getVersions } from "@/app/api/posts/[id]/versions/route";
import { GET as getRoles, POST as createRole } from "@/app/api/roles/route";
import { requirePermission, jsonOk, jsonError, handleApiError } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";
import { securityAdminUseCases } from "@/modules/security-admin";
import { toPermissionDto, toRoleDto } from "@/modules/security-admin/presentation/dto";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
  jsonOk: vi.fn((data) => Response.json({ success: true, data })),
  jsonError: vi.fn((msg, status) => Response.json({ success: false, message: msg }, { status })),
  handleApiError: vi.fn((e) => Response.json({ message: (e as Error).message }, { status: 500 })),
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    listPostVersions: vi.fn(),
  },
}));

vi.mock("@/modules/security-admin", () => ({
  securityAdminUseCases: {
    listRolesAndPermissions: vi.fn(),
    createRole: vi.fn(),
  },
}));

vi.mock("@/modules/security-admin/presentation/dto", () => ({
  toPermissionDto: vi.fn((p) => ({ id: p.id, name: p.name })),
  toRoleDto: vi.fn((r) => ({ id: r.id, name: r.name })),
}));

describe("Versions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/posts/[id]/versions", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/posts/1/versions");
      const context = { params: Promise.resolve({ id: "1" }) };

      const res = await getVersions(req, context);
      expect(res.status).toBe(401);
    });

    it("should return 404 if post not found", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.listPostVersions as any).mockResolvedValue(null);

      const req = new Request("http://localhost/api/posts/1/versions");
      const context = { params: Promise.resolve({ id: "1" }) };

      await getVersions(req, context);
      expect(jsonError).toHaveBeenCalledWith("文章不存在", 404);
    });

    it("should return versions list", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.listPostVersions as any).mockResolvedValue({
        versions: [
          {
            id: "v1",
            title: "Version 1",
            excerpt: "Excerpt text",
            editor: { name: "Editor", email: "editor@test.com" },
            createdAt: new Date("2024-01-01"),
          },
        ],
      });

      const req = new Request("http://localhost/api/posts/1/versions");
      const context = { params: Promise.resolve({ id: "1" }) };

      await getVersions(req, context);
      expect(jsonOk).toHaveBeenCalled();
    });

    it("should handle version without editor", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.listPostVersions as any).mockResolvedValue({
        versions: [
          {
            id: "v1",
            title: "Version 1",
            excerpt: "Excerpt text",
            editor: null,
            createdAt: new Date("2024-01-01"),
          },
        ],
      });

      const req = new Request("http://localhost/api/posts/1/versions");
      const context = { params: Promise.resolve({ id: "1" }) };

      await getVersions(req, context);
      expect(jsonOk).toHaveBeenCalled();
    });
  });
});

describe("Roles API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/roles", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const res = await getRoles();
      expect(res.status).toBe(401);
    });

    it("should return roles and permissions", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (securityAdminUseCases.listRolesAndPermissions as any).mockResolvedValue({
        roles: [{ id: "1", name: "admin" }],
        permissions: [{ id: "1", name: "posts:write" }],
      });

      await getRoles();
      expect(jsonOk).toHaveBeenCalled();
      expect(toRoleDto).toHaveBeenCalled();
      expect(toPermissionDto).toHaveBeenCalled();
    });
  });

  describe("POST /api/roles", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/roles", {
        method: "POST",
        body: JSON.stringify({ name: "test" }),
      });

      const res = await createRole(req);
      expect(res.status).toBe(401);
    });

    it("should create role successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (securityAdminUseCases.createRole as any).mockResolvedValue({
        id: "1",
        name: "new-role",
      });

      const req = new Request("http://localhost/api/roles", {
        method: "POST",
        body: JSON.stringify({ name: "new-role" }),
      });

      await createRole(req);
      expect(jsonOk).toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (securityAdminUseCases.createRole as any).mockRejectedValue(
        new Error("Duplicate")
      );

      const req = new Request("http://localhost/api/roles", {
        method: "POST",
        body: JSON.stringify({ name: "existing" }),
      });

      await createRole(req);
      expect(handleApiError).toHaveBeenCalled();
    });
  });
});
