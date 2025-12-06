import { describe, expect, it, vi } from "vitest";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-utils";
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
});
