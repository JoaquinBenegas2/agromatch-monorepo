import type {
  BreedingPlan,
  Classification,
  Farm,
  Female,
  PlanItem,
} from '@org/shared-types';
import { PlanService } from './plan.service';
import { DomainError } from '../../common/errors/domain-error';
import type { BullRepo } from '../../repos/bull.port';
import type { ClassificationRepo } from '../../repos/classification.port';
import type { FarmRepo } from '../../repos/farm.port';
import type { FemaleRepo } from '../../repos/female.port';
import type { PlanRepo } from '../../repos/plan.port';
import type { GeneticMatchingService } from '../genetic-matching/genetic-matching.service';

const farm: Farm = {
  id: 'farm-a',
  name: 'Tambo A',
  location: 'Córdoba',
  tierQuotas: { sexedPct: 25, beefPct: 30 },
  calvingEaseMaxHeifer: 2.5,
  scsGrayZone: { from: 3.1, to: 3.18 },
  plGrayZone: { from: 0, to: 0.2 },
};

function makeService(
  overrides: {
    plan?: BreedingPlan;
    classificationItems?: Classification[] | null;
    females?: Female[];
  } = {},
) {
  let plan: BreedingPlan = overrides.plan ?? {
    id: 'plan-farm-a',
    farmId: 'farm-a',
    createdAt: new Date().toISOString(),
    items: [],
    totals: {
      doses: { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 },
      cost: 0,
      avgExpectedProgeny: {},
    },
  };

  const planRepo: PlanRepo = {
    getOrCreate: jest.fn(async () => plan),
    save: jest.fn(async (p: BreedingPlan) => {
      plan = p;
      return plan;
    }),
  };
  const femaleRepo: FemaleRepo = {
    listByFarm: jest.fn(async () => overrides.females ?? []),
    findById: jest.fn(
      async () => ({ id: 'fem-3031', farmId: 'farm-a' }) as Female,
    ),
    upsertMany: jest.fn(),
  };
  const classificationRepo: ClassificationRepo = {
    listByFarm: jest.fn(async () =>
      overrides.classificationItems === null
        ? null
        : {
            goal: {
              preset: 'BALANCED' as const,
              weights: {},
              wantBetaA2: false,
              wantKappaBB: false,
            },
            items: overrides.classificationItems ?? [
              {
                femaleId: 'fem-3031',
                tier: 'ELITE',
                semenType: 'SEXED',
                ciPercentile: 95,
                tags: [],
                corrective: [],
                reasons: [],
              },
            ],
          },
    ),
    replaceForFarm: jest.fn(),
  };
  const bullRepo: BullRepo = {
    list: jest.fn(async () => []),
    findByNaab: jest.fn(
      async (naab: string) =>
        ({ naab, pricePerDose: naab === '029HO20544' ? 16 : 22 }) as never,
    ),
    upsertMany: jest.fn(),
  };
  const farmRepo: FarmRepo = {
    findById: jest.fn(async () => farm),
    findByIds: jest.fn(async () => [farm]),
  };

  const matching = {
    getBoard: jest.fn(async () => ({
      ranked: ['029HO20544', '029HO21010'].map((naab) => ({
        capabilityId: naab,
        compatibility: 95,
        verticalFacts: {
          femaleVisualId: '3031',
          femaleCategory: 'COW',
          tier: 'ELITE',
          corrective: [],
          goal: {
            preset: 'BALANCED',
            weights: {},
            wantBetaA2: false,
            wantKappaBB: false,
          },
          bull: { naab, name: 'Toro', company: 'Proveedor', breed: 'HO' },
          semenType: 'SEXED',
          damTraits: null,
          expectedProgeny: null,
          deltaVsDam: null,
          caseinOdds: { betaA2A2: null, kappaBB: null },
          compatibility: 95,
          rank: 1,
          totalCandidates: 2,
          reasons: [],
        },
      })),
    })),
  };
  const service = new PlanService(
    planRepo,
    femaleRepo,
    classificationRepo,
    bullRepo,
    farmRepo,
    matching as unknown as GeneticMatchingService,
  );
  return { service, planRepo, femaleRepo, matching, getPlan: () => plan };
}

const item: PlanItem = {
  femaleId: 'fem-3031',
  bullNaab: '029HO20544',
  semenType: 'SEXED',
  compatibility: 95,
  pricePerDose: 16,
};

describe('PlanService (B5, REQ-D-10 a REQ-D-12)', () => {
  it('recalculates price, compatibility and semen type instead of trusting the browser', async () => {
    const { service } = makeService();
    const plan = await service.addItem('farm-a', {
      ...item,
      pricePerDose: 1,
      compatibility: 100,
      semenType: 'BEEF',
    });
    expect(plan.items[0]).toEqual(item);
  });

  it('rejects a female outside the farm without saving', async () => {
    const { service, femaleRepo, planRepo } = makeService();
    jest.mocked(femaleRepo.findById).mockResolvedValue(null);
    await expect(service.addItem('farm-a', item)).rejects.toMatchObject({
      code: 'FEMALE_NOT_FOUND',
    });
    expect(planRepo.save).not.toHaveBeenCalled();
  });

  it('rejects candidates excluded by the engine without saving', async () => {
    const { service, matching, planRepo } = makeService();
    matching.getBoard.mockResolvedValue({ ranked: [] });
    await expect(service.addItem('farm-a', item)).rejects.toMatchObject({
      code: 'CANDIDATE_NOT_ELIGIBLE',
    });
    expect(planRepo.save).not.toHaveBeenCalled();
  });
  it('addItem agrega un ítem nuevo y recalcula doses/cost', async () => {
    const { service, getPlan } = makeService();
    const plan = await service.addItem('farm-a', item);
    expect(plan.items).toHaveLength(1);
    expect(plan.totals.doses.SEXED).toBe(1);
    expect(plan.totals.cost).toBe(16);
    expect(getPlan().items).toHaveLength(1);
  });

  it('addItem para la misma hembra reemplaza el ítem (una hembra, un toro, REQ-D-12)', async () => {
    const { service } = makeService({
      plan: {
        id: 'plan-farm-a',
        farmId: 'farm-a',
        createdAt: new Date().toISOString(),
        items: [item],
        totals: {
          doses: { SEXED: 1, CONVENTIONAL: 0, BEEF: 0 },
          cost: 16,
          avgExpectedProgeny: {},
        },
      },
    });
    const other: PlanItem = {
      ...item,
      bullNaab: '029HO21010',
      pricePerDose: 22,
    };
    const plan = await service.addItem('farm-a', other);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].bullNaab).toBe('029HO21010');
    expect(plan.totals.cost).toBe(22);
  });

  it('removeItem saca el ítem y recalcula totales', async () => {
    const { service } = makeService({
      plan: {
        id: 'plan-farm-a',
        farmId: 'farm-a',
        createdAt: new Date().toISOString(),
        items: [item],
        totals: {
          doses: { SEXED: 1, CONVENTIONAL: 0, BEEF: 0 },
          cost: 16,
          avgExpectedProgeny: {},
        },
      },
    });
    const plan = await service.removeItem('farm-a', 'fem-3031');
    expect(plan.items).toHaveLength(0);
    expect(plan.totals.cost).toBe(0);
  });

  it('autoFill sin clasificación → 409 HERD_NOT_CLASSIFIED', async () => {
    const { service } = makeService({ classificationItems: [] });
    const goal = {
      preset: 'BALANCED' as const,
      weights: {},
      wantBetaA2: false,
      wantKappaBB: false,
    };
    await expect(service.autoFill('farm-a', goal)).rejects.toBeInstanceOf(
      DomainError,
    );
    try {
      await service.autoFill('farm-a', goal);
      fail('expected to throw');
    } catch (err) {
      expect((err as DomainError).code).toBe('HERD_NOT_CLASSIFIED');
      expect((err as DomainError).getStatus()).toBe(409);
    }
  });
});
