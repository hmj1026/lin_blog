import { createSecurityAdminUseCases } from "./application/use-cases";
import { securityAdminRepositoryPrisma } from "./infrastructure/prisma/security-admin.repository.prisma";

export const securityAdminUseCases = createSecurityAdminUseCases({ repo: securityAdminRepositoryPrisma });

