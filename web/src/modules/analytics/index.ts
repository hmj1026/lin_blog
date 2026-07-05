import { createAnalyticsUseCases } from "./application/use-cases";
import { analyticsRepositoryPrisma } from "./infrastructure/prisma/analytics.repository.prisma";

export const analyticsUseCases = createAnalyticsUseCases({ analytics: analyticsRepositoryPrisma });
export { DEVICE_TYPES, isDeviceType, type DeviceType } from "./domain/device-type";

