import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT as putTag, DELETE as deleteTag } from "@/app/api/tags/[id]/route";
import { PUT as putRole, DELETE as deleteRole } from "@/app/api/roles/[id]/route";
import { requirePermission, jsonOk, jsonError, handleApiError } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";
import { securityAdminUseCases } from "@/modules/security-admin";
import { toRoleDto } from "@/modules/security-admin/presentation/dto";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
  jsonOk: vi.fn((data) => Response.json({ success: true, data })),
  jsonError: vi.fn((msg) => Response.json({ success: false, message: msg }, { status: 400 })),
  handleApiError: vi.fn((e) => Response.json({ message: (e as Error).message }, { status: 500 })),
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    updateTag: vi.fn(),
    removeTag: vi.fn(),
  },
}));

vi.mock("@/modules/security-admin", () => ({
  securityAdminUseCases: {
    updateRole: vi.fn(),
    softDeleteRole: vi.fn(),
  },
}));

vi.mock("@/modules/security-admin/presentation/dto", () => ({
  toRoleDto: vi.fn((r) => ({ id: r.id, name: r.name })),
}));

describe("Tags [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PUT /api/tags/[id]", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/tags/1", {
        method: "PUT",
        body: JSON.stringify({ name: "test", slug: "test" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      const res = await putTag(req, context);
      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid data", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const req = new Request("http://localhost/api/tags/1", {
        method: "PUT",
        body: JSON.stringify({ name: "" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      await putTag(req, context);
      expect(jsonError).toHaveBeenCalled();
    });

    it("should update tag successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.updateTag as any).mockResolvedValue({ id: "1", name: "Updated" });

      const req = new Request("http://localhost/api/tags/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated", slug: "updated" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      await putTag(req, context);
      expect(jsonOk).toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.updateTag as any).mockRejectedValue(new Error("DB error"));

      const req = new Request("http://localhost/api/tags/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Test", slug: "test" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      await putTag(req, context);
      expect(handleApiError).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/tags/[id]", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/tags/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      const res = await deleteTag(req, context);
      expect(res.status).toBe(401);
    });

    it("should delete tag successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.removeTag as any).mockResolvedValue({ id: "1" });

      const req = new Request("http://localhost/api/tags/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      await deleteTag(req, context);
      expect(jsonOk).toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.removeTag as any).mockRejectedValue(new Error("Error"));

      const req = new Request("http://localhost/api/tags/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      await deleteTag(req, context);
      expect(handleApiError).toHaveBeenCalled();
    });
  });
});

describe("Roles [id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PUT /api/roles/[id]", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/roles/1", {
        method: "PUT",
        body: JSON.stringify({ name: "test" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      const res = await putRole(req, context);
      expect(res.status).toBe(401);
    });

    it("should update role successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (securityAdminUseCases.updateRole as any).mockResolvedValue({ id: "1", name: "Updated" });

      const req = new Request("http://localhost/api/roles/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      await putRole(req, context);
      expect(jsonOk).toHaveBeenCalled();
      expect(toRoleDto).toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (securityAdminUseCases.updateRole as any).mockRejectedValue(new Error("Error"));

      const req = new Request("http://localhost/api/roles/1", {
        method: "PUT",
        body: JSON.stringify({ name: "Test" }),
      });
      const context = { params: Promise.resolve({ id: "1" }) };

      await putRole(req, context);
      expect(handleApiError).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/roles/[id]", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/roles/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      const res = await deleteRole(req, context);
      expect(res.status).toBe(401);
    });

    it("should delete role successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (securityAdminUseCases.softDeleteRole as any).mockResolvedValue({ id: "1" });

      const req = new Request("http://localhost/api/roles/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      await deleteRole(req, context);
      expect(jsonOk).toHaveBeenCalledWith(expect.objectContaining({ id: "1", ok: true }));
    });

    it("should handle errors", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (securityAdminUseCases.softDeleteRole as any).mockRejectedValue(new Error("Error"));

      const req = new Request("http://localhost/api/roles/1", { method: "DELETE" });
      const context = { params: Promise.resolve({ id: "1" }) };

      await deleteRole(req, context);
      expect(handleApiError).toHaveBeenCalled();
    });
  });
});
