import { z } from 'zod';
import {
  BullSchema,
  FarmSchema,
  UserSchema,
  FemaleSchema,
  ProviderSchema,
  CapabilitySchema,
  NeedSchema,
  MappingProposalSchema,
  HerdImportResultSchema,
  ClassificationSchema,
  ClassificationSummarySchema,
  MatchBoardSchema,
  ExplanationSchema,
  ExplanationFactsSchema,
  BreedingPlanSchema,
  FarmSummarySchema,
  ChatAnswerSchema,
} from '../src/schemas.js';
import {
  farms,
  users,
  bullsSeed,
  providers,
  capabilities,
  needsSamples,
  herdFarmA,
  herdFarmB,
  herdFarmC,
  samples,
} from './index.js';

describe('fixtures validate against their zod schemas (REQ-SC-05)', () => {
  it('farms.json → 3 tambos con zonas grises', () => {
    const parsed = z.array(FarmSchema).parse(farms);
    expect(parsed).toHaveLength(3);
    for (const farm of parsed) {
      expect(farm.scsGrayZone).toEqual({ from: 3.1, to: 3.18 });
      expect(farm.plGrayZone).toEqual({ from: 0, to: 0.2 });
    }
  });

  it('users.json → 4 usuarios + una cuenta PROVIDER por ficha de proveedor', () => {
    const parsed = z.array(UserSchema).parse(users);
    const humans = parsed.filter((u) => u.role !== 'PROVIDER');
    const providerAccounts = parsed.filter((u) => u.role === 'PROVIDER');
    expect(humans).toHaveLength(4);
    expect(providerAccounts).toHaveLength(providers.length);
    expect(providerAccounts.every((u) => u.providerId)).toBe(true);
    expect(parsed.find((u) => u.id === 'asesor-1')?.farmIds).toEqual([
      'farm-a',
      'farm-b',
      'farm-c',
    ]);
  });

  it('bulls.json → entre 20 y 30 toros reales, todos válidos (REQ-A-11)', () => {
    const parsed = z.array(BullSchema).parse(bullsSeed);
    expect(parsed.length).toBeGreaterThanOrEqual(20);
    expect(parsed.length).toBeLessThanOrEqual(30);

    // Scenario "Validación del catálogo real": ningún lechero sin CDCB, source citada.
    for (const bull of parsed) {
      if (bull.profile) expect(bull.profile.scale).toBe('CDCB');
      expect(bull.source.length).toBeGreaterThan(0);
    }

    // Scenario "Cobertura de la demo": los padres de herd-farm-a.json están, con ≥2 hijos de 029HO19531.
    const fundador = parsed.find((b) => b.naab === '029HO19531');
    expect(fundador).toBeDefined();
    const sons = parsed.filter((b) => b.sireNaab === '029HO19531');
    expect(sons.length).toBeGreaterThanOrEqual(2);
    expect(parsed.some((b) => b.naab === '029HO21010')).toBe(true);

    // A2/A2 y BB presentes (parte del "incluir" de REQ-A-11).
    expect(parsed.some((b) => b.profile?.betaCasein === 'A2/A2')).toBe(true);
    expect(parsed.some((b) => b.profile?.kappaCasein === 'BB')).toBe(true);

    const dairyWithLowScs = parsed.filter(
      (b) =>
        b.profile !== null &&
        b.profile.scale === 'CDCB' &&
        b.profile.traits.scs <= 2.8 &&
        b.semenTypes.includes('CONVENTIONAL'),
    );
    expect(dairyWithLowScs.length).toBeGreaterThanOrEqual(3);

    const beefBulls = parsed.filter((b) => b.semenTypes.includes('BEEF'));
    expect(beefBulls.length).toBeGreaterThanOrEqual(4);
    for (const bull of beefBulls) {
      expect(bull.profile).toBeNull();
      expect(bull.semenTypes).toEqual(['BEEF']);
    }
    // Al menos 3 toros de carne tienen calvingEase real y comparable (los nuevos
    // reales de GENEX publican CED/CE en una escala distinta, ver bulls.json).
    expect(beefBulls.filter((b) => b.calvingEase !== null).length).toBeGreaterThanOrEqual(3);
  });

  it('providers.json → proveedores no verificados', () => {
    const parsedProviders = z.array(ProviderSchema).parse(providers);
    const parsedCapabilities = z.array(CapabilitySchema).parse(capabilities);
    expect(parsedProviders.length).toBeGreaterThan(0);
    for (const provider of parsedProviders) {
      expect(provider.verified).toBe(false);
    }
    expect(parsedCapabilities.length).toBeGreaterThan(0);
  });

  it('needs.samples.json → 5 necesidades válidas', () => {
    expect(needsSamples).toHaveLength(5);
    for (const sample of needsSamples) {
      NeedSchema.parse(sample.need);
    }
    const machineryOne = needsSamples[0];
    expect(machineryOne.need.category).toBe('MACHINERY');
    expect(machineryOne.need.magnitude).toEqual({ value: 40, unit: 'HA' });
    expect(machineryOne.need.status).toBe('DRAFT');
  });

  it('herd-farm-a.json conserva sus rarezas (293 animales)', () => {
    const parsed = z.array(FemaleSchema).parse(herdFarmA.females);
    expect(parsed).toHaveLength(293);

    const noSire = parsed.filter((f) => f.sireNaab === null);
    expect(noSire).toHaveLength(2);

    const nonNumeric = parsed.filter((f) => !/^[0-9]+$/.test(f.visualId));
    expect(nonNumeric.length).toBeGreaterThan(0);

    const bySire = new Map<string, number>();
    for (const f of parsed) {
      if (f.sireNaab) bySire.set(f.sireNaab, (bySire.get(f.sireNaab) ?? 0) + 1);
    }
    expect(bySire.get('029HO19531')).toBe(41);

    for (const f of parsed) {
      if (f.profile) expect(f.profile.scale).toBe('CDCB');
    }
  });

  it('herd-farm-b.json y herd-farm-c.json son rodeos sintéticos de ~150 animales', () => {
    const parsedB = z.array(FemaleSchema).parse(herdFarmB.females);
    const parsedC = z.array(FemaleSchema).parse(herdFarmC.females);
    expect(parsedB).toHaveLength(150);
    expect(parsedC).toHaveLength(150);
    for (const f of [...parsedB, ...parsedC]) {
      expect(f.profile?.source).toBe('DEMO SINTÉTICO');
    }
  });

  it('samples/*.json validan contra su esquema', () => {
    MappingProposalSchema.parse(samples.mappingProposal);
    HerdImportResultSchema.parse(samples.herdImportResult);
    z.array(ClassificationSchema).parse(samples.classifications);
    ClassificationSummarySchema.parse(samples.classificationSummary);
    MatchBoardSchema.parse(samples.matchBoardGenetics);
    MatchBoardSchema.parse(samples.matchBoardMachinery);
    ExplanationSchema.parse(samples.explanation);
    ExplanationFactsSchema.parse(samples.explanationFacts);
    BreedingPlanSchema.parse(samples.breedingPlan);
    z.array(FarmSummarySchema).parse(samples.farmSummaries);
    NeedSchema.parse(samples.needDraft);
    ChatAnswerSchema.parse(samples.chatAnswer);
  });

  it('un perfil sin escala CDCB no valida (RN-01)', () => {
    const invalidBull = {
      ...bullsSeed[0],
      profile: { ...bullsSeed[0].profile, scale: 'ACHA' },
    };
    expect(() => BullSchema.parse(invalidBull)).toThrow();
  });
});
