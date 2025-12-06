import { createAnalyticsUseCases } from "./application/use-cases";
import { analyticsRepositoryPrisma } from "./infrastructure/prisma/analytics.repository.prisma";

export const analyticsUseCases = createAnalyticsUseCases({ analytics: analyticsRepositoryPrisma });

