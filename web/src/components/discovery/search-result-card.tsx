import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { DiscoveryPostSummary } from "./types";

/** coverImage 為空時的預設封面（與站台其他卡片一致）。 */
const DEFAULT_COVER = "/images/hero-community.svg";

type SearchResultCardProps = {
  post: DiscoveryPostSummary;
};

/**
 * 站內搜尋結果卡片。
 *
 * 只消費公開安全的 {@link DiscoveryPostSummary}（不含作者、標籤、內文等欄位），
 * 符合 public-post-discovery 規格「搜尋結果只包含公開展示需要的安全欄位」的要求。
 * 為純導覽 Link（伺服器元件），不做客戶端互動，封面採固定 16:9 比例。
 */
export function SearchResultCard({ post }: SearchResultCardProps) {
  const hero = post.coverImage ?? DEFAULT_COVER;
  const unoptimized = hero.startsWith("/api/files/");

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-soft dark:bg-base-100 dark:border-base-200"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-base-50 dark:bg-base-200">
        <Image
          src={hero}
          alt={post.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized={unoptimized}
        />
      </div>

      <div className="flex flex-1 flex-col space-y-3 pt-4">
        <div className="flex items-center gap-2 text-xs text-base-300 dark:text-base-500">
          {post.category && <Badge variant="accent">{post.category}</Badge>}
          {post.publishedAt && <span>{formatDate(new Date(post.publishedAt))}</span>}
        </div>

        <h3 className="font-display text-xl leading-snug text-primary transition group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-400">
          {post.title}
        </h3>

        <p className="line-clamp-2 text-sm text-base-300 dark:text-base-500">{post.excerpt}</p>
      </div>
    </Link>
  );
}
