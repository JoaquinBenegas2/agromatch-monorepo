import { Global, Module } from '@nestjs/common';
import { BULL_REPO } from './bull.port.js';
import { CLASSIFICATION_REPO } from './classification.port.js';
import { FARM_REPO } from './farm.port.js';
import { FEMALE_REPO } from './female.port.js';
import { HERD_IMPORT_REPO } from './herd-import.port.js';
import { NEED_REPO } from './need.port.js';
import { PLAN_REPO } from './plan.port.js';
import { PrismaBullRepo } from './prisma/bull.repo.js';
import { PrismaClassificationRepo } from './prisma/classification.repo.js';
import { PrismaFarmRepo } from './prisma/farm.repo.js';
import { PrismaFemaleRepo } from './prisma/female.repo.js';
import { PrismaHerdImportRepo } from './prisma/herd-import.repo.js';
import { PrismaNeedRepo } from './prisma/need.repo.js';
import { PrismaPlanRepo } from './prisma/plan.repo.js';
import { PrismaProviderRepo } from './prisma/provider.repo.js';
import { PrismaReviewRepo } from './prisma/review.repo.js';
import { PrismaServiceRequestRepo } from './prisma/service-request.repo.js';
import { PrismaUserRepo } from './prisma/user.repo.js';
import { PROVIDER_REPO } from './provider.port.js';
import { REVIEW_REPO } from './review.port.js';
import { SERVICE_REQUEST_REPO } from './service-request.port.js';
import { USER_REPO } from './user.port.js';
import { createMemoryProviders } from './memory.providers.js';
import { useMemoryRepositories } from './repository-mode.js';
import { NEGOTIATION_REPO } from './negotiation.port.js';
import { PrismaNegotiationRepo } from './prisma/negotiation.repo.js';

/**
 * Registra cada repositorio detrás de su token de inyección (REQ-AK-01).
 * `@Global` para que cualquier módulo de flujo lo consuma sin re-importarlo.
 */
@Global()
@Module({
  providers: useMemoryRepositories
    ? createMemoryProviders()
    : [
        { provide: NEGOTIATION_REPO, useClass: PrismaNegotiationRepo },
        { provide: USER_REPO, useClass: PrismaUserRepo },
        { provide: FARM_REPO, useClass: PrismaFarmRepo },
        { provide: FEMALE_REPO, useClass: PrismaFemaleRepo },
        { provide: BULL_REPO, useClass: PrismaBullRepo },
        { provide: CLASSIFICATION_REPO, useClass: PrismaClassificationRepo },
        { provide: PLAN_REPO, useClass: PrismaPlanRepo },
        { provide: NEED_REPO, useClass: PrismaNeedRepo },
        { provide: PROVIDER_REPO, useClass: PrismaProviderRepo },
        { provide: SERVICE_REQUEST_REPO, useClass: PrismaServiceRequestRepo },
        { provide: REVIEW_REPO, useClass: PrismaReviewRepo },
        { provide: HERD_IMPORT_REPO, useClass: PrismaHerdImportRepo },
      ],
  exports: [
    NEGOTIATION_REPO,
    USER_REPO,
    FARM_REPO,
    FEMALE_REPO,
    BULL_REPO,
    CLASSIFICATION_REPO,
    PLAN_REPO,
    NEED_REPO,
    PROVIDER_REPO,
    SERVICE_REQUEST_REPO,
    REVIEW_REPO,
    HERD_IMPORT_REPO,
  ],
})
export class RepositoriesModule {}
