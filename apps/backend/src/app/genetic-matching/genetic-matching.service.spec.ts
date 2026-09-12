import type {
  Bull,
  Capability,
  Classification,
  Farm,
  Female,
  GenomicProfile,
  Need,
  Provider,
} from '@org/shared-types';
import { GeneticMatchingService } from './genetic-matching.service';
import { DomainError } from '../../common/errors/domain-error';
import type { BullRepo } from '../../repos/bull.port';
import type { ClassificationRepo } from '../../repos/classification.port';
import type { FarmRepo } from '../../repos/farm.port';
import type { FemaleRepo } from '../../repos/female.port';
import type { NeedRepo } from '../../repos/need.port';
import type { ProviderRepo } from '../../repos/provider.port';

const profile: GenomicProfile = {
  traits: { ci: 620, milk: 780, fat: 1.4, pro: 24, pl: 2.1, scs: 2.75, fs: -40, rfi: 3.1 },
  betaCasein: 'A2/A2',
  kappaCasein: 'BB',
  scale: 'CDCB',
  source: 'test',
};

const female: Female = {
  id: 'fem-3031',
  farmId: 'farm-a',
  visualId: '3031',
  birthDate: '2024-01-01',
  sireNaab: null,
  category: 'COW',
  profile,
};

const farm: Farm = {
  id: 'farm-a',
  name: 'Tambo A',
  location: 'Córdoba',
  tierQuotas: { sexedPct: 25, beefPct: 30 },
  calvingEaseMaxHeifer: 2.5,
  scsGrayZone: { from: 3.1, to: 3.18 },
  plGrayZone: { from: 0, to: 0.2 },
};

const classification: Classification = {
  femaleId: 'fem-3031',
  tier: 'COMMERCIAL',
  semenType: 'SEXED',
  ciPercentile: 60,
  tags: [],
  corrective: ['scs'],
  reasons: ['stub'],
};

const bull: Bull = {
  naab: '029HO20544',
  name: 'Don Rufino 4012',
  company: 'Central Genética Norte',
  breed: 'HO',
  profile,
  sireNaab: null,
  calvingEase: 2.8,
  semenTypes: ['SEXED', 'CONVENTIONAL'],
  pricePerDose: 16,
  source: 'test',
};

const capability: Capability = {
  id: '029HO20544',
  providerId: 'prov-genetics-norte',
  category: 'GENETICS',
  serviceType: 'semen',
  coverageRadiusKm: 500,
  availability: [],
  priceModel: 'PER_UNIT',
  certifications: [],
  attributes: {},
};

const provider: Provider = {
  id: 'prov-genetics-norte',
  name: 'Central Genética Norte',
  type: 'SEMEN_COMPANY',
  // La Need sintética (B4) es `synthetic: true`: `hardFilters` (M2) no aplica
  // radio ni ventana, así que la base del proveedor puede ser la real.
  base: { lat: -32.944, lng: -60.65, label: 'Rosario, Santa Fe' },
  verified: false,
  reputation: { avg: 4.5, jobs: 130 },
  contact: {},
  source: 'test',
};

function makeService(overrides: {
  classificationItems?: Classification[];
  needs?: Map<string, Need>;
  female?: Female;
  farm?: Farm | null;
} = {}) {
  const needs = overrides.needs ?? new Map<string, Need>();
  const theFemale = overrides.female ?? female;
  const theFarm = overrides.farm === undefined ? farm : overrides.farm;

  const femaleRepo: FemaleRepo = {
    findById: jest.fn(async (_farmId: string, id: string) => (id === theFemale.id ? theFemale : null)),
    listByFarm: jest.fn(async () => [theFemale]),
    upsertMany: jest.fn(),
  };
  const classificationRepo: ClassificationRepo = {
    listByFarm: jest.fn(async () => ({
      goal: { preset: 'BALANCED' as const, weights: {}, wantBetaA2: false, wantKappaBB: false },
      items: overrides.classificationItems ?? [classification],
    })),
    replaceForFarm: jest.fn(),
  };
  const needRepo: NeedRepo = {
    findById: jest.fn(async (id: string) => needs.get(id) ?? null),
    create: jest.fn(async (n: Need) => {
      needs.set(n.id, n);
      return n;
    }),
    update: jest.fn(async (n: Need) => {
      needs.set(n.id, n);
      return n;
    }),
    listByFarm: jest.fn(async () => [...needs.values()]),
    saveMatchBoard: jest.fn(async () => undefined),
  };
  const bullRepo: BullRepo = {
    list: jest.fn(async () => [bull]),
    findByNaab: jest.fn(async () => bull),
    upsertMany: jest.fn(),
  };
  const providerRepo: ProviderRepo = {
    list: jest.fn(async () => [provider]),
    findById: jest.fn(async () => provider),
    listCapabilities: jest.fn(async () => [capability]),
    updateReputation: jest.fn(async () => provider),
  };

  // El servicio exige el `farm`: sin su umbral de parto el vertical no podría
  // aplicar RN-06 y una vaquillona recibiría toros prohibidos.
  const farmRepo: FarmRepo = {
    findById: jest.fn(async () => theFarm),
    findByIds: jest.fn(async () => (theFarm ? [theFarm] : [])),
  };

  const service = new GeneticMatchingService(
    femaleRepo,
    classificationRepo,
    needRepo,
    bullRepo,
    providerRepo,
    farmRepo,
  );
  return { service, needRepo, needs };
}

const goal = { preset: 'SOLIDS_CHEESE' as const, weights: {}, wantBetaA2: false, wantKappaBB: false };

describe('GeneticMatchingService (B4, ADR-0002, REQ-D-01/02/03)', () => {
  it('hembra sin clasificación vigente → 409 HERD_NOT_CLASSIFIED', async () => {
    const { service } = makeService({ classificationItems: [] });
    await expect(service.getBoard('farm-a', 'fem-3031', goal)).rejects.toThrow(DomainError);
    try {
      await service.getBoard('farm-a', 'fem-3031', goal);
      fail('expected to throw');
    } catch (err) {
      expect((err as DomainError).code).toBe('HERD_NOT_CLASSIFIED');
      expect((err as DomainError).getStatus()).toBe(409);
    }
  });

  it('hembra con semenType null (CULL_ALERT) → 409 HERD_NOT_CLASSIFIED', async () => {
    const { service } = makeService({
      classificationItems: [{ ...classification, tier: 'CULL_ALERT', semenType: null }],
    });
    await expect(service.getBoard('farm-a', 'fem-3031', goal)).rejects.toThrow(DomainError);
  });

  it('el matching real pasa por matchNeed: category GENETICS, un candidato por toro compatible', async () => {
    const { service } = makeService();
    const board = await service.getBoard('farm-a', 'fem-3031', goal);
    expect(board.ranked.length).toBe(1);
    expect(board.ranked[0].capabilityId).toBe(bull.naab);
    expect(board.ranked[0].providerId).toBe(provider.id);
  });

  it('RN-06 llega al motor: para una vaquillona, el toro con parto 2.8 > 2.5 del tambo queda excluido', async () => {
    const { service } = makeService({ female: { ...female, category: 'HEIFER' } });
    const board = await service.getBoard('farm-a', 'fem-3031', goal);
    expect(board.ranked).toHaveLength(0);
    expect(board.excluded).toHaveLength(1);
    const rn06 = board.excluded[0].filters.find((f) => f.rule === 'RN-06');
    expect(rn06?.passed).toBe(false);
    expect(rn06?.detail).toContain('2.8');
  });

  it('sin establecimiento → 404 FARM_NOT_FOUND, nunca se matchea sin el umbral de parto', async () => {
    const { service } = makeService({ farm: null });
    await expect(service.getBoard('farm-a', 'fem-3031', goal)).rejects.toMatchObject({ code: 'FARM_NOT_FOUND' });
  });

  it('el Need sintético se reutiliza (REQ-D-03): dos llamadas, un solo create', async () => {
    const { service, needRepo } = makeService();
    await service.getBoard('farm-a', 'fem-3031', goal);
    await service.getBoard('farm-a', 'fem-3031', goal);
    expect((needRepo.create as jest.Mock).mock.calls.length).toBe(1);
  });

  it('el Need sintético tiene category GENETICS y queda marcado synthetic', async () => {
    const { service, needs } = makeService();
    await service.getBoard('farm-a', 'fem-3031', goal);
    const need = needs.get('synthetic:farm-a:fem-3031');
    expect(need?.category).toBe('GENETICS');
    expect(need?.synthetic).toBe(true);
  });
});
