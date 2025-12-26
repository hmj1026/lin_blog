import { describe, expect, it, vi, beforeEach } from "vitest";
import { jsonOk, jsonError, handleApiError, requireAuth, requirePermission, requireAnyPermission } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";
import { securityAdminUseCases } from "@/modules/security-admin";

vi.mock("@/lib/auth", () => ({
    getSession: vi.fn()
}));

vi.mock("@/modules/security-admin", () => ({
    securityAdminUseCases: {
        roleHasPermission: vi.fn(),
        roleHasAnyPermission: vi.fn()
    }
}));

import { ApiException } from "@/lib/errors";
import { NextResponse } from "next/server";

describe("api-utils", () => {
    describe("jsonOk", () => {
        it("回傳格式正確的成功回應", async () => {
            const data = { foo: "bar" };
            const response = jsonOk(data);
            const json = await response.json();

            expect(response).toBeInstanceOf(NextResponse);
            expect(response.status).toBe(200);
            expect(json).toEqual({ success: true, data });
        });

        it("接受自定義 init 參數", async () => {
             const response = jsonOk({}, { status: 201 });
             expect(response.status).toBe(201);
        });
    });

    describe("jsonError", () => {
        it("回傳格式正確的錯誤回應", async () => {
            const message = "Something went wrong";
            const response = jsonError(message, 404);
            const json = await response.json();

            expect(response).toBeInstanceOf(NextResponse);
            expect(response.status).toBe(404);
            expect(json).toEqual({ success: false, message });
        });

        it("預設 status 為 400", () => {
             const response = jsonError("Error");
             expect(response.status).toBe(400);
        });
    });

    describe("handleApiError", () => {
        beforeEach(() => {
            vi.spyOn(console, "warn").mockImplementation(() => {});
            vi.spyOn(console, "error").mockImplementation(() => {});
        });

        it("處理 ApiException", async () => {
            const error = new ApiException("Forbidden", 403);
            const response = handleApiError(error);
            const json = await response.json();

            expect(response.status).toBe(403);
            expect(json.message).toBe("Forbidden");
        });

        it("處理一般 Error", async () => {
            const error = new Error("System Error");
            const response = handleApiError(error);
            const json = await response.json();

            expect(response.status).toBe(400); // Default for standard Error
            expect(json.message).toBe("System Error");
        });

        it("處理未知錯誤", async () => {
            const response = handleApiError("unknown string error");
            const json = await response.json();

            expect(response.status).toBe(500);
            expect(json.message).toBe("未知錯誤");
        });
    });


    describe("auth guards", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("requireAuth returns null if session exists", async () => {
             (getSession as any).mockResolvedValue({ user: { id: "u1" } });
             const result = await requireAuth();
             expect(result).toBeNull();
        });

        it("requireAuth returns 401 if no session", async () => {
             (getSession as any).mockResolvedValue(null);
             const result = await requireAuth();
             expect(result).toBeInstanceOf(NextResponse);
             expect(result?.status).toBe(401);
        });

        it("requirePermission returns null if authorized", async () => {
            (getSession as any).mockResolvedValue({ user: { id: "u1", roleId: "r1" } });
            (securityAdminUseCases.roleHasPermission as any).mockResolvedValue(true);
            
            const result = await requirePermission("posts:write");
            
            expect(result).toBeNull();
            expect(securityAdminUseCases.roleHasPermission).toHaveBeenCalledWith("r1", "posts:write");
        });

        it("requirePermission returns 401 if not logged in", async () => {
            (getSession as any).mockResolvedValue(null);
            const result = await requirePermission("perm");
            expect(result?.status).toBe(401);
        });

        it("requirePermission returns 403 if no role", async () => {
            (getSession as any).mockResolvedValue({ user: { id: "u1" } }); // no roleId
            const result = await requirePermission("perm");
            expect(result?.status).toBe(403);
        });

        it("requirePermission returns 403 if permission denied", async () => {
            (getSession as any).mockResolvedValue({ user: { id: "u1", roleId: "r1" } });
            (securityAdminUseCases.roleHasPermission as any).mockResolvedValue(false);
            const result = await requirePermission("perm");
            expect(result?.status).toBe(403);
        });

        it("requireAnyPermission returns null if authorized", async () => {
            (getSession as any).mockResolvedValue({ user: { roleId: "r1" } });
            (securityAdminUseCases.roleHasAnyPermission as any).mockResolvedValue(true);
            const result = await requireAnyPermission(["p1", "p2"]);
            expect(result).toBeNull();
        });

        it("requireAnyPermission returns 403 if denied", async () => {
            (getSession as any).mockResolvedValue({ user: { roleId: "r1" } });
            (securityAdminUseCases.roleHasAnyPermission as any).mockResolvedValue(false);
            const result = await requireAnyPermission(["p1"]);
            expect(result?.status).toBe(403);
        });
    });
});

