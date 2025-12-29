/**
 * 日期時間格式化工具函數
 * 統一後台頁面的日期顯示格式
 */

/**
 * 將數字補零至兩位數
 */
export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * 格式化日期時間為 YYYY-MM-DD HH:mm:ss
 * 用於後台列表顯示
 */
export function formatDateTime(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * 格式化日期為 YYYY-MM-DD
 * 用於簡易日期顯示
 */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 格式化日期時間為 YYYY-MM-DDTHH:mm:ss
 * 用於 HTML datetime-local input
 */
export function formatLocalDateTimeInput(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}
