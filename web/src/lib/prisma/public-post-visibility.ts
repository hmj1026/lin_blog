/**
 * 公開文章讀取的「發佈時間界限」Prisma where 片段（單一真相來源）。
 *
 * 一篇文章要對外公開可見，除了 `status = PUBLISHED` 且未刪除外，其 `publishedAt`
 * 必須為 `null`（視為即時公開）或已 <= 指定時間；藉此排除「PUBLISHED + 未來
 * `publishedAt`」文章洩漏至任何公開讀取路徑（列表／分頁／搜尋／相關／計數／
 * sitemap／探索熱門・最新）。
 *
 * 由 posts 與 discovery 兩模組的 Prisma repository 共用，作為此不變量的 SSOT，
 * 避免規則變更（例如加入緩衝時間或時區處理）時多份拷貝各自漂移。回傳純物件、
 * 不依賴 Prisma 型別，可安全被任一 infrastructure 匯入。
 *
 * @param now - 判斷發佈時間界限的當下時間（呼叫端傳入以利測試）
 */
export function publishTimeReached(now: Date) {
  return { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] };
}
