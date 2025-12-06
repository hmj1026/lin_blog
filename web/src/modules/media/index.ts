import { createMediaUseCases } from "./application/use-cases";
import { uploadRepositoryPrisma } from "./infrastructure/prisma/upload.repository.prisma";

export const mediaUseCases = createMediaUseCases({ uploads: uploadRepositoryPrisma });

