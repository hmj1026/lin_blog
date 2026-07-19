import { createAuditUseCases } from "./application/use-cases";
import { auditRepositoryPrisma } from "./infrastructure/prisma/audit.repository.prisma";

/** 生產環境 audit use case 組合根。 */
export const auditUseCases = createAuditUseCases({ repo: auditRepositoryPrisma });
