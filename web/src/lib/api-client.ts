/**
 * API 回應類型與解析工具
 * 統一後台 CRUD 頁面的 API 呼叫模式
 */

/**
 * 標準 API 回應類型
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; message?: string; data?: null };

/**
 * 解析 API 回應 JSON
 */
export async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json()) as ApiResponse<T>;
}

/**
 * 從 API 回應中取得錯誤訊息
 */
export function getApiErrorMessage<T>(
  json: ApiResponse<T>,
  fallback = "操作失敗"
): string {
  if (json.success) return "";
  return json.message || fallback;
}

/**
 * 檢查 API 回應是否成功
 */
export function isApiSuccess<T>(
  res: Response,
  json: ApiResponse<T>
): json is { success: true; data: T } {
  return res.ok && json.success;
}
