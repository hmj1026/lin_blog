/** 依 total 與 pageSize 計算總頁數，至少為 1（total 為 0 時亦視為 1 頁）。 */
export function computeTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * 判斷是否需要以最後一頁重新查詢：僅當「本次查無資料」且「篩選後仍有總筆數」
 * 且「請求頁碼超過縮減後的總頁數」時才成立，避免對真正的空結果（total 為 0）誤觸發重查。
 * 回傳應重查的頁碼，否則回傳 null。
 */
export function resolveOverflowPage(params: {
  itemCount: number;
  total: number;
  page: number;
  totalPages: number;
}): number | null {
  const { itemCount, total, page, totalPages } = params;
  if (itemCount === 0 && total > 0 && page > totalPages) {
    return totalPages;
  }
  return null;
}
