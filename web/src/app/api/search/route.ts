import { jsonOk, jsonError } from "@/lib/api-utils";
import { discoveryQueries } from "@/lib/server-queries";
import { parseSearchPage } from "@/modules/discovery/application/parse-search-page";
import { NextRequest } from "next/server";

/**
 * GET /api/search - 公開站內搜尋（有界分頁）。
 *
 * 走 discovery 模組的 `searchPublicPosts`：僅回傳已發佈、未刪除且已到發佈時間的
 * 文章之公開安全欄位，並套用有界頁碼／每頁筆數。空白查詢回傳空結果，不列出全部文章。
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const page = parseSearchPage(searchParams.get("page"));

  const result = await discoveryQueries.searchPublicPosts({ query, page });

  if (result.kind === "error") {
    // 暫時性錯誤：回傳泛化 503，讓呼叫端能區分「沒有結果」與「服務故障」；
    // 不洩漏內部錯誤細節。
    return jsonError("搜尋服務暫時無法使用，請稍後再試", 503);
  }

  if (result.kind === "empty-query") {
    // 空白查詢：回傳空的有界分頁結果，不列出全部文章。
    return jsonOk({ items: [], total: 0, page: 1, pageSize: 10 });
  }

  return jsonOk({
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}
