import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/modules/security-admin", () => ({
  securityAdminUseCases: {
    getPermissionsVersion: vi.fn(),
    getUserAuthSnapshot: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { authOptions } from "@/lib/auth";
import { securityAdminUseCases } from "@/modules/security-admin";
import { requirePermission } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    getSession: vi.fn(),
  };
});

describe("authOptions.callbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("jwt callback", () => {
    it("version-hit：版本號未變時不重新查詢資料庫，權限維持不變", async () => {
      const token: any = { sub: "u1", permissionsVersion: 5, permissions: ["posts:write"] };
      (securityAdminUseCases.getPermissionsVersion as any).mockResolvedValue(5);

      const result = await (authOptions.callbacks.jwt as any)({ token });

      expect(securityAdminUseCases.getUserAuthSnapshot).not.toHaveBeenCalled();
      expect(result.permissions).toEqual(["posts:write"]);
    });

    it("downgrade：版本號變動時重新查詢並反映權限被降級", async () => {
      const token: any = { sub: "u1", permissionsVersion: 5, permissions: ["posts:write"] };
      (securityAdminUseCases.getPermissionsVersion as any).mockResolvedValue(6);
      (securityAdminUseCases.getUserAuthSnapshot as any).mockResolvedValue({
        roleId: "r1",
        roleKey: "k",
        roleName: "n",
        permissionKeys: [],
      });

      const result = await (authOptions.callbacks.jwt as any)({ token });

      expect(result.permissions).toEqual([]);
      expect(result.permissionsVersion).toBe(6);

      const session: any = { user: {} };
      const sessionResult = await (authOptions.callbacks.session as any)({ session, token: result });
      expect(sessionResult.user.permissions).toEqual([]);

      (getSession as any).mockResolvedValue(sessionResult);
      const guard = await requirePermission("posts:write");
      expect(guard?.status).toBe(403);
    });

    it("token 缺少 sub（舊版/異常 token）：直接標記 invalid，不查詢資料庫", async () => {
      const token: any = { permissionsVersion: 5, permissions: ["posts:write"] };
      (securityAdminUseCases.getPermissionsVersion as any).mockResolvedValue(6);

      const result = await (authOptions.callbacks.jwt as any)({ token });

      expect(result.invalid).toBe(true);
      expect(result.permissions).toEqual([]);
      // 沒有 sub 就不應觸發使用者查詢
      expect(securityAdminUseCases.getUserAuthSnapshot).not.toHaveBeenCalled();
    });

    it("login 路徑：使用 authorize 傳入的 permissionsVersion，不重複查詢版本", async () => {
      const token: any = {};
      const user: any = {
        roleId: "r1",
        roleKey: "k",
        roleName: "n",
        permissions: ["posts:write"],
        permissionsVersion: 9,
      };

      const result = await (authOptions.callbacks.jwt as any)({ token, user });

      expect(result.permissionsVersion).toBe(9);
      expect(result.permissions).toEqual(["posts:write"]);
      expect(result.invalid).toBe(false);
      // authorize 已提供版本，jwt 不應再打一次 getPermissionsVersion
      expect(securityAdminUseCases.getPermissionsVersion).not.toHaveBeenCalled();
    });

    it("使用者或角色已被刪除：token 標記為 invalid，session 清空", async () => {
      const token: any = { sub: "u1", permissionsVersion: 5, permissions: ["posts:write"] };
      (securityAdminUseCases.getPermissionsVersion as any).mockResolvedValue(6);
      (securityAdminUseCases.getUserAuthSnapshot as any).mockResolvedValue(null);

      const result = await (authOptions.callbacks.jwt as any)({ token });

      expect(result.invalid).toBe(true);

      const session: any = { user: {} };
      const sessionResult = await (authOptions.callbacks.session as any)({ session, token: result });
      expect(sessionResult.user).toBeUndefined();
    });
  });
});
