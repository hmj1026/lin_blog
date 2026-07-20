/**
 * 後台 RSC 頁面共用的 searchParams 正規化工具。
 *
 * Next.js 對重複的 query param（`?category=a&category=b`）會給出 `string[]`；
 * RSC 頁面在把值傳入查詢層前須先單值正規化，否則陣列會流入 Prisma 造成整頁崩潰。
 */

/** 取重複 query param 的首值；單值原樣回傳，未提供回傳 undefined。 */
export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * 解析 `YYYY-MM-DD` 日期字串為 Asia/Taipei 當日邊界的 Date。
 *
 * @param value 日期字串；格式不符或非法一律回傳 undefined。
 * @param endOfDay 為 true 時取當日 23:59:59.999，否則取 00:00:00.000。
 */
export function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
