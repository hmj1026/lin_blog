import { jsonOk, requirePermission } from "@/lib/api-utils";
import { analyticsUseCases } from "@/modules/analytics";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/stats - 取得 Dashboard 統計數據
 */
export async function GET(request: NextRequest) {
  const authError = await requirePermission("analytics:view");
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7", 10);
  const data = await analyticsUseCases.getDashboardStats({ days });
  return jsonOk(data);
}
