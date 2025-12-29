import { publicEnv } from "@/env.public";

/**
 * 取得站點 URL
 * - 生產環境：必須設定 NEXT_PUBLIC_SITE_URL，否則拋出錯誤
 * - 開發環境：允許使用預設值 http://localhost:3000
 * 
 * @returns 站點 URL（不含尾部斜線）
 * @throws Error 當生產環境未設定 NEXT_PUBLIC_SITE_URL 時
 */
export function getSiteUrl(): string {
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  
  if (siteUrl) {
    // 移除尾部斜線以確保一致性
    return siteUrl.replace(/\/$/, "");
  }
  
  // 生產環境必須設定 NEXT_PUBLIC_SITE_URL
  if (publicEnv.NODE_ENV === "production") {
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
