import { randomUUID } from 'node:crypto';
import type { Provider as NestProvider } from '@nestjs/common';
import type {
  BreedingPlan,
  MatchBoard,
  Need,
  Review,
  ServiceRequest,
} from '@org/shared-types';
import {
  bullsSeed,
  capabilities,
  farms,
  herdFarmA,
  herdFarmB,
  herdFarmC,
  providers,
  users,
} from '@org/shared-types/fixtures';
import { BULL_REPO, type BullRepo } from './bull.port.js';
import {
  CLASSIFICATION_REPO,
  type ClassificationRepo,
} from './classification.port.js';
import { FARM_REPO, type FarmRepo } from './farm.port.js';
import { FEMALE_REPO, type FemaleRepo } from './female.port.js';
import { HERD_IMPORT_REPO, type HerdImportRepo } from './herd-import.port.js';
import { NEED_REPO, type NeedRepo } from './need.port.js';
import { PLAN_REPO, type PlanRepo } from './plan.port.js';
import { PROVIDER_REPO, type ProviderRepo } from './provider.port.js';
import { REVIEW_REPO, type ReviewRepo } from './review.port.js';
import {
  SERVICE_REQUEST_REPO,
  type ServiceRequestRepo,
} from './service-request.port.js';
import { USER_REPO, type UserRepo } from './user.port.js';
import {
  NEGOTIATION_REPO,
  type NegotiationRepo,
  type NegotiationRecord,
} from './negotiation.port.js';

/** Isolated state per Nest application; the same seed and ports as Prisma. */
export function createMemoryProviders(): NestProvider[] {
  const copy = <T>(value: T): T => structuredClone(value);
  const females = copy([
    ...herdFarmA.females,
    ...herdFarmB.females,
    ...herdFarmC.females,
  ]);
  const bulls = copy(bullsSeed);
  const suppliers = copy(providers);
  const classifications = new Map<
    string,
    Awaited<ReturnType<ClassificationRepo['listByFarm']>>
  >();
  const plans = new Map<string, BreedingPlan>();
  const needs = new Map<string, Need>();
  const boards = new Map<string, MatchBoard>();
  const requests = new Map<string, ServiceRequest>();
  const negotiations = new Map<string, NegotiationRecord>();
  const reviews = new Map<string, Review>();
  const imports = new Map<
    string,
    NonNullable<Awaited<ReturnType<HerdImportRepo['get']>>>
  >();
  const userRepo: UserRepo = {
    findById: async (id) => copy(users.find((u) => u.id === id) ?? null),
  };
  const farmRepo: FarmRepo = {
    findById: async (id) => copy(farms.find((f) => f.id === id) ?? null),
    findByIds: async (ids) => copy(farms.filter((f) => ids.includes(f.id))),
  };
  const femaleRepo: FemaleRepo = {
    listByFarm: async (farmId) =>
      copy(females.filter((f) => f.farmId === farmId)),
    findById: async (farmId, id) =>
      copy(females.find((f) => f.farmId === farmId && f.id === id) ?? null),
    upsertMany: async (farmId, incoming) => {
      const oldIds = new Map(
        females
          .filter((f) => f.farmId === farmId)
          .map((f) => [f.visualId, f.id]),
      );
      const replacement = copy(incoming).map((f) => ({
        ...f,
        farmId,
        id: oldIds.get(f.visualId) ?? f.id,
      }));
      females.splice(
        0,
        females.length,
        ...females.filter((f) => f.farmId !== farmId),
        ...replacement,
      );
      return replacement.length;
    },
  };
  const bullRepo: BullRepo = {
    list: async () => copy(bulls),
    findByNaab: async (naab) =>
      copy(bulls.find((b) => b.naab === naab) ?? null),
    upsertMany: async (incoming) => {
      let added = 0,
        updated = 0;
      for (const bull of copy(incoming)) {
        const index = bulls.findIndex((b) => b.naab === bull.naab);
        if (index < 0) {
          bulls.push(bull);
          added++;
        } else {
          bulls[index] = bull;
          updated++;
        }
      }
      return { added, updated };
    },
  };
  const classificationRepo: ClassificationRepo = {
    listByFarm: async (farmId) => copy(classifications.get(farmId) ?? null),
    replaceForFarm: async (farmId, goal, items) => {
      if (items.length) classifications.set(farmId, copy({ goal, items }));
      else classifications.delete(farmId);
    },
  };
  const planRepo: PlanRepo = {
    getOrCreate: async (farmId) => {
      if (!plans.has(farmId))
        plans.set(farmId, {
          id: randomUUID(),
          farmId,
          createdAt: new Date().toISOString(),
          items: [],
          totals: {
            doses: { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 },
            cost: 0,
            avgExpectedProgeny: {},
          },
        });
      return copy(plans.get(farmId) as BreedingPlan);
    },
    save: async (plan) => {
      plans.set(plan.farmId, copy(plan));
      return copy(plan);
    },
  };
  const needRepo: NeedRepo = {
    create: async (need) => {
      needs.set(need.id, copy(need));
      return copy(need);
    },
    update: async (need) => {
      if (!needs.has(need.id)) throw new Error('Need not found');
      needs.set(need.id, copy(need));
      return copy(need);
    },
    findById: async (id) => copy(needs.get(id) ?? null),
    listByFarm: async (farmId, opts) =>
      copy(
        [...needs.values()].filter(
          (n) =>
            n.farmId === farmId && (opts?.includeSynthetic || !n.synthetic),
        ),
      ),
    saveMatchBoard: async (id, board) => {
      if (!needs.has(id)) throw new Error('Need not found');
      boards.set(id, copy(board));
    },
  };
  const providerRepo: ProviderRepo = {
    list: async (filter) =>
      copy(
        suppliers.filter(
          (p) =>
            !filter?.category ||
            capabilities.some(
              (c) => c.providerId === p.id && c.category === filter.category,
            ),
        ),
      ),
    findById: async (id) => copy(suppliers.find((p) => p.id === id) ?? null),
    listCapabilities: async (filter) =>
      copy(
        capabilities.filter(
          (c) => !filter?.category || c.category === filter.category,
        ),
      ),
    updateReputation: async (id, reputation) => {
      const provider = suppliers.find((p) => p.id === id);
      if (!provider) throw new Error('Provider not found');
      provider.reputation = copy(reputation);
      return copy(provider);
    },
  };
  const requestRepo: ServiceRequestRepo = {
    create: async (request, creatorName) => {
      const saved = { ...copy(request), updatedAt: request.createdAt };
      requests.set(saved.id, saved);
      negotiations.set(saved.id, {
        ...copy(saved),
        messages: [
          {
            id: randomUUID(),
            serviceRequestId: saved.id,
            senderUserId: saved.createdByUserId ?? null,
            senderName: creatorName,
            senderType: 'CUSTOMER',
            body: saved.message,
            createdAt: saved.createdAt,
          },
        ],
      });
      return copy(saved);
    },
    findById: async (id) => copy(requests.get(id) ?? null),
  };
  const negotiationRepo: NegotiationRepo = {
    list: async (filter) =>
      copy(
        [...negotiations.values()]
          .filter(
            (n) =>
              (!filter.providerId || n.providerId === filter.providerId) &&
              (!filter.needIds || filter.needIds.includes(n.needId)),
          )
          .sort((a, b) =>
            (b.updatedAt ?? b.createdAt).localeCompare(
              a.updatedAt ?? a.createdAt,
            ),
          ),
      ),
    findById: async (id) => copy(negotiations.get(id) ?? null),
    append: async (id, message, status) => {
      const conversation = negotiations.get(id);
      if (!conversation) throw new Error('Negotiation not found');
      const now = new Date().toISOString();
      conversation.messages.push({
        ...copy(message),
        id: randomUUID(),
        serviceRequestId: id,
        createdAt: now,
      });
      conversation.status = status;
      conversation.updatedAt = now;
      const request = requests.get(id);
      if (request) {
        request.status = status;
        request.updatedAt = now;
      }
    },
  };
  const reviewRepo: ReviewRepo = {
    create: async (review) => {
      reviews.set(review.id, copy(review));
      return copy(review);
    },
  };
  const importRepo: HerdImportRepo = {
    save: async (id, farmId, file, filename, proposal) => {
      imports.set(
        id,
        copy({ farmId, file: new Uint8Array(file), filename, proposal }),
      );
    },
    get: async (id) => copy(imports.get(id) ?? null),
  };
  return [
    { provide: NEGOTIATION_REPO, useValue: negotiationRepo },
    { provide: USER_REPO, useValue: userRepo },
    { provide: FARM_REPO, useValue: farmRepo },
    { provide: FEMALE_REPO, useValue: femaleRepo },
    { provide: BULL_REPO, useValue: bullRepo },
    { provide: CLASSIFICATION_REPO, useValue: classificationRepo },
    { provide: PLAN_REPO, useValue: planRepo },
    { provide: NEED_REPO, useValue: needRepo },
    { provide: PROVIDER_REPO, useValue: providerRepo },
    { provide: SERVICE_REQUEST_REPO, useValue: requestRepo },
    { provide: REVIEW_REPO, useValue: reviewRepo },
    { provide: HERD_IMPORT_REPO, useValue: importRepo },
  ];
}
