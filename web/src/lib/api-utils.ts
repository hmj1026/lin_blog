import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { ApiException } from "./errors";
import { ApiResponse } from "@/types/api";
import { securityAdminUseCases } from "@/modules/security-admin";
import { logger } from "./logger";

/**
 * 建立成功的 JSON 回應
 *
 * @param data - 回應的資料內容
 * @param init - 回應的初始化選項 (status, headers 等)
 * @returns Next.js 的 JSON 回應物件
 */
export function jsonOk<T>(data: T, init?: ResponseInit) {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, init);
}

/**
 * 建立錯誤的 JSON 回應
 *
 * @param message - 錯誤訊息
 * @param status - HTTP 狀態碼 (預設 400)
 * @returns Next.js 的 JSON 回應物件
 */
export function jsonError(message: string, status = 400) {
  const body: ApiResponse<null> = { success: false, message };
  return NextResponse.json(body, { status });
}

/**
 * 統一處理 API 錯誤
 *
 * @param error - 捕獲到的錯誤物件
 * @returns 格式化後的 JSON 錯誤回應
 */
export function handleApiError(error: unknown) {
  if (error instanceof ApiException) {
    logger.warn("API Exception", { message: error.message, status: error.status });
    return jsonError(error.message, error.status);
  }
  if (error instanceof Error) {
    logger.error("API Error", { message: error.message, stack: error.stack });
    return jsonError(error.message, 400);
  }
  logger.error("Unknown API Error", { error });
  return jsonError("未知錯誤", 500);
}

/**
 * 驗證請求是否已登入
 *
 * @returns 若未登入回傳 401 錯誤回應，否則回傳 null
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return jsonError("未授權", 401);
  }
  return null;
}

/**
 * 驗證請求是否擁有特定權限
 *
 * @param permissionKey - 權限鍵值
 * @returns 若無權限回傳 401/403 錯誤回應，否則回傳 null
 */
export async function requirePermission(permissionKey: string) {
  const session = await getSession();
  if (!session?.user) return jsonError("未授權", 401);
  const roleId = session.user.roleId;
  if (!roleId) return jsonError("禁止存取", 403);

  const ok = await securityAdminUseCases.roleHasPermission(roleId, permissionKey);
  if (!ok) return jsonError("禁止存取", 403);
  return null;
}

/**
 * 驗證請求是否擁有任一權限
 *
 * @param permissionKeys - 權限鍵值陣列
 * @returns 若無權限回傳 401/403 錯誤回應，否則回傳 null
 */
export async function requireAnyPermission(permissionKeys: string[]) {
  const session = await getSession();
  if (!session?.user) return jsonError("未授權", 401);
  const roleId = session.user.roleId;
  if (!roleId) return jsonError("禁止存取", 403);

  const ok = await securityAdminUseCases.roleHasAnyPermission(roleId, permissionKeys);
  if (!ok) return jsonError("禁止存取", 403);
  return null;
}
