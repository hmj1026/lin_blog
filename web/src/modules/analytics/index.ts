import { createAnalyticsUseCases } from "./application/use-cases";
import { analyticsRepositoryPrisma } from "./infrastructure/prisma/analytics.repository.prisma";
import { publicEnv } from "@/env.public";

// 站點主機來源走 Zod 驗證過的 SSOT；非法值會在 env 解析階段就以清楚訊息中止，而非在此 new URL 崩潰。
const configuredSiteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;

export const analyticsUseCases = createAnalyticsUseCases({
  analytics: analyticsRepositoryPrisma,
  internalHosts: configuredSiteUrl ? [new URL(configuredSiteUrl).hostname] : [],
});
export { DEVICE_TYPES, isDeviceType, type DeviceType } from "./domain/device-type";
export { maskIpAddress } from "./domain/reporting";
