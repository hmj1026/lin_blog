/**
 * 將搜尋 page query 解析為正整數；缺少、格式不完整或超出安全整數時回傳第 1 頁。
 */
export const parseSearchPage = (raw: string | null | undefined): number => {
  if (!raw || !/^\d+$/.test(raw)) return 1;

  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
};
