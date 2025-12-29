"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { AuthorChip } from "./author-chip";
import { FrontendPost } from "@/lib/frontend/post";

type PostCardProps = {
  post: FrontendPost;
  layout?: "vertical" | "horizontal";
};

/**
 * 根據寬高比判斷最適合的 aspect-ratio 類別
 */
function getAspectClass(ratio: number): string {
  if (ratio >= 1.6) return "aspect-video";      // 16:9 或更寬
  if (ratio >= 1.2) return "aspect-[4/3]";      // 4:3
  if (ratio >= 0.9) return "aspect-square";     // 1:1
  return "aspect-[3/4]";                         // 直式圖片
}

export function PostCard({ post, layout = "vertical" }: PostCardProps) {
  const isHorizontal = layout === "horizontal";
  const unoptimized = post.hero.startsWith("/api/files/");
  
  // 動態比例偵測：預設使用 16:9，載入後根據實際尺寸調整
  const [aspectClass, setAspectClass] = useState("aspect-video");
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-soft dark:bg-base-100 dark:border-base-200 dark:shadow-xl dark:shadow-accent-500/5 dark:hover:shadow-accent-500/10 ${
        isHorizontal 
          ? "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-[2fr_3fr]" 
          : "flex flex-col"
      }`}
    >
      {/* 圖片區域 - 動態 aspect-ratio + object-cover 滿版 */}
      <div className={`relative overflow-hidden rounded-xl bg-base-50 dark:bg-base-200 ${aspectClass} ${
        !imageLoaded ? "animate-pulse" : ""
      }`}>
        <Image
          src={post.hero}
          alt={post.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={post.featured}
          unoptimized={unoptimized}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              const ratio = img.naturalWidth / img.naturalHeight;
              setAspectClass(getAspectClass(ratio));
              setImageLoaded(true);
            }
          }}
        />
      </div>
      
      {/* 內容區域 */}
      <div className="flex flex-1 flex-col space-y-3 pt-4">
        {/* 分類 + 日期 + 閱讀時間 */}
        <div className="flex items-center gap-2 text-xs text-base-300 dark:text-base-500">
          <Badge variant="accent">{post.category}</Badge>
          <span>{post.date}</span>
          <span aria-hidden>•</span>
          <span>{post.readingTime}</span>
        </div>
        
        {/* 標題 */}
        <h3 className="font-display text-xl leading-snug text-primary transition group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-400">
          {post.title}
        </h3>
        
        {/* 摘要 */}
        <p className="text-sm text-base-300 dark:text-base-500 line-clamp-2">{post.excerpt}</p>
        
        {/* 標籤 */}
        <div className="flex flex-wrap gap-2">
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-base-50 dark:bg-base-200 px-3 py-1 text-xs font-medium text-base-400 dark:text-base-500">
              <span className="h-1 w-1 rounded-full bg-accent-500" />
              {tag}
            </span>
          ))}
        </div>
        
        {/* 作者 + 繼續閱讀 */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-line dark:border-base-200">
          <AuthorChip author={post.author} />
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 dark:text-accent-400 opacity-0 transition group-hover:opacity-100">
            繼續閱讀
            <svg className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}




