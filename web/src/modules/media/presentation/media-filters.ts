/**
 * 媒體庫類型篩選的單一來源（SSOT）。
 *
 * `value` 為 mime 前綴，供管理端 UI 下拉選單與伺服端 query 驗證共用，
 * 避免 `["image/", "video/", "application/pdf"]` 字面值散落於多處。
 * 純資料常數、無 server-only 依賴，client 與 server 皆可匯入。
 */
export const MEDIA_FILTER_TYPES = [
  { value: "image/", label: "圖片" },
  { value: "video/", label: "影片" },
  { value: "application/pdf", label: "PDF" },
] as const;

/** 允許的篩選前綴值清單，供伺服端驗證 requestedType 使用。 */
export const MEDIA_FILTER_TYPE_VALUES: readonly string[] = MEDIA_FILTER_TYPES.map(
  (option) => option.value
);
