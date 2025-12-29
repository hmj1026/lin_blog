/**
 * 取得站點 URL
 * 
 * 注意：此函數直接讀取 process.env 而非 publicEnv，
 * 確保 Server Components 在 runtime 取得正確的環境變數值。
 * （NEXT_PUBLIC_* 變數會在 build time 被編譯進 client code，
 *  但 Server Side process.env 可在 runtime 正確讀取。）
 * 
 * - 生產環境：必須設定 NEXT_PUBLIC_SITE_URL，否則拋出錯誤
 * - 開發環境：允許使用預設值 http://localhost:3000
 * 
 * @returns 站點 URL（不含尾部斜線）
 * @throws Error 當生產環境未設定 NEXT_PUBLIC_SITE_URL 時
 */
export function getSiteUrl(): string {
  // 直接讀取 process.env 確保 Server Side runtime 使用正確值
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  
  if (siteUrl) {
    // 移除尾部斜線以確保一致性
    return siteUrl.replace(/\/$/, "");
  }
  
  // 生產環境必須設定 NEXT_PUBLIC_SITE_URL
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL 環境變數未設定。" +
      "在生產環境中必須設定此變數，例如：NEXT_PUBLIC_SITE_URL=https://example.com"
    );
  }
  
  // 開發環境使用預設值
  return "http://localhost:3000";
}

/**
 * 生成文章的完整 URL
 * @param slug 文章的 slug
 * @returns 文章的完整 URL
 */
export function getPostUrl(slug: string): string {
  return `${getSiteUrl()}/blog/${slug}`;
}
