import type { Female, HerdImportResult } from '@org/shared-types';
import { HerdImportService } from './herd-import.service.js';

const mapping = {
  headerRow: 0,
  columns: { ID: 'visualId', Fecha: 'birthDate' },
} as const;
const female: Female = {
  id: 'f',
  farmId: 'farm',
  visualId: '1',
  birthDate: '2024-01-01',
  sireNaab: null,
  category: 'HEIFER',
  profile: {
    traits: { ci: 1, milk: 1, fat: 1, pro: 1, pl: 1, scs: 3, fs: 1, rfi: 1 },
    betaCasein: null,
    kappaCasein: null,
    scale: 'CDCB',
    source: 'internal',
  },
};
function setup(incoming: Female[] = [female]) {
  let persisted: Female[] = [];
  const result: HerdImportResult = {
    females: incoming,
    rowsOk: incoming.length,
    rowsRejected: [],
    warnings: [],
  };
  const imports = {
    get: jest
      .fn()
      .mockResolvedValue({
        farmId: 'farm',
        filename: 'real.xlsx',
        file: new Uint8Array(),
        proposal: {},
      }),
  };
  const females = {
    upsertMany: jest.fn(async (_farmId, rows: Female[]) => {
      persisted = rows.map((f) => ({ ...f, id: 'stable-db-id' }));
    }),
    listByFarm: jest.fn(async () => persisted),
  };
  const classifications = {
    listByFarm: jest
      .fn()
      .mockResolvedValue({
        goal: {
          preset: 'BALANCED',
          weights: {},
          wantBetaA2: false,
          wantKappaBB: false,
        },
        items: [],
      }),
    replaceForFarm: jest.fn(),
  };
  const plans = {
    getOrCreate: jest
      .fn()
      .mockResolvedValue({
        id: 'plan',
        farmId: 'farm',
        items: [{ femaleId: 'old' }],
      }),
    save: jest.fn(),
  };
  const service = new HerdImportService(
    { applyMapping: jest.fn().mockResolvedValue(result) } as never,
    imports as never,
    females as never,
    classifications as never,
    plans as never,
  );
  return { service, imports, females, classifications, plans };
}
describe('HerdImportService', () => {
  it('rejects imports that do not belong to the farm', async () => {
    const { service, females } = setup();
    await expect(service.confirm('other', 'id', mapping)).rejects.toMatchObject(
      { code: 'HERD_IMPORT_NOT_FOUND' },
    );
    expect(females.upsertMany).not.toHaveBeenCalled();
  });
  it('returns persisted identities and filename, invalidates classification and clears the previous plan', async () => {
    const { service, classifications, plans } = setup();
    const confirmed = await service.confirm('farm', 'id', mapping);
    expect(confirmed.females[0]?.id).toBe('stable-db-id');
    expect(confirmed.females[0]?.profile?.source).toBe('real.xlsx');
    expect(classifications.replaceForFarm).toHaveBeenCalledWith(
      'farm',
      expect.any(Object),
      [],
    );
    expect(plans.save).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
        totals: {
          doses: { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 },
          cost: 0,
          avgExpectedProgeny: {},
        },
      }),
    );
  });
  it.each([
    ['HERD_IMPORT_EMPTY', []],
    ['HERD_IMPORT_DUPLICATE_ID', [female, { ...female, id: 'duplicate' }]],
  ] as const)(
    'preserves the previous herd and plan for %s',
    async (code, rows) => {
      const { service, females, plans } = setup([...rows]);
      await expect(
        service.confirm('farm', 'id', mapping),
      ).rejects.toMatchObject({ code });
      expect(females.upsertMany).not.toHaveBeenCalled();
      expect(plans.save).not.toHaveBeenCalled();
    },
  );
});
