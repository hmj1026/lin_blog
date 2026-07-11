/**
 * discovery 模組 DI composition root。
 *
 * 以 Prisma-backed `DiscoveryPostsPort` / `DiscoveryAnalyticsPort` 實作組裝
 * 公開讀取 use case 單例，供 `server-queries.ts` 等呼叫端使用；呼叫端一律
 * 經由 `discoveryUseCases`，不得直接依賴本模組的 infrastructure。
 */
import "server-only";

import { createDiscoveryUseCases } from "./application/use-cases";
import { discoveryPostsRepositoryPrisma } from "./infrastructure/prisma/discovery-posts.repository.prisma";
import { discoveryAnalyticsRepositoryPrisma } from "./infrastructure/prisma/discovery-analytics.repository.prisma";

export const discoveryUseCases = createDiscoveryUseCases({
  posts: discoveryPostsRepositoryPrisma,
  analytics: discoveryAnalyticsRepositoryPrisma,
});

export { createDiscoveryUseCases } from "./application/use-cases";
export type { DiscoveryUseCases } from "./application/use-cases";
export type { PublicPostSummary } from "./application/dto";
export { toPublicPostSummary } from "./application/dto";
export type { DiscoveryAnalyticsPort, DiscoveryPostsPort, PostSourceRecord, SearchResult } from "./application/ports";
