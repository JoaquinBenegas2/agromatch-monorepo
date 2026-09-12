import { Global, Module, type Provider } from '@nestjs/common';
import { BULL_REPO } from './bull.port.js';
import { CLASSIFICATION_REPO } from './classification.port.js';
import { FARM_REPO } from './farm.port.js';
import { FEMALE_REPO } from './female.port.js';
import { HERD_IMPORT_REPO } from './herd-import.port.js';
import { MemoryStore } from './memory/memory-store.js';
import { InMemoryBullRepo } from './memory/bull.repo.js';
import { InMemoryClassificationRepo } from './memory/classification.repo.js';
import { InMemoryFarmRepo } from './memory/farm.repo.js';
import { InMemoryFemaleRepo } from './memory/female.repo.js';
import { InMemoryHerdImportRepo } from './memory/herd-import.repo.js';
import { InMemoryNeedRepo } from './memory/need.repo.js';
import { InMemoryPlanRepo } from './memory/plan.repo.js';
import { InMemoryProviderRepo } from './memory/provider.repo.js';
import { InMemoryReviewRepo } from './memory/review.repo.js';
import { InMemoryServiceRequestRepo } from './memory/service-request.repo.js';
import { InMemoryUserRepo } from './memory/user.repo.js';
import { NEED_REPO } from './need.port.js';
import { PLAN_REPO } from './plan.port.js';
import { isMemoryPersistence } from './persistence.js';
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

const PRISMA_PROVIDERS: Provider[] = [
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
];

const MEMORY_PROVIDERS: Provider[] = [
  MemoryStore,
  { provide: USER_REPO, useClass: InMemoryUserRepo },
  { provide: FARM_REPO, useClass: InMemoryFarmRepo },
  { provide: FEMALE_REPO, useClass: InMemoryFemaleRepo },
  { provide: BULL_REPO, useClass: InMemoryBullRepo },
  { provide: CLASSIFICATION_REPO, useClass: InMemoryClassificationRepo },
  { provide: PLAN_REPO, useClass: InMemoryPlanRepo },
  { provide: NEED_REPO, useClass: InMemoryNeedRepo },
  { provide: PROVIDER_REPO, useClass: InMemoryProviderRepo },
  { provide: SERVICE_REQUEST_REPO, useClass: InMemoryServiceRequestRepo },
  { provide: REVIEW_REPO, useClass: InMemoryReviewRepo },
  { provide: HERD_IMPORT_REPO, useClass: InMemoryHerdImportRepo },
];

/**
 * Registra cada repositorio detrás de su token de inyección (REQ-AK-01).
 * `@Global` para que cualquier módulo de flujo lo consuma sin re-importarlo.
 * Con `PERSISTENCE=memory` (repos/persistence.ts) registra las
 * implementaciones en memoria sembradas con fixtures en vez de Prisma
 * (docs/qa-config.md §6.2) — mismos tokens, mismos exports.
 */
@Global()
@Module({
  providers: isMemoryPersistence() ? MEMORY_PROVIDERS : PRISMA_PROVIDERS,
  exports: [
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
