import type { Capability, Need, Provider, VerticalEngine } from '@org/shared-types';
import { hardFilters, listVerticals, matchNeed, registerVertical, scoreCandidate } from './matching-core.js';

/**
 * Vertical de prueba genérico: matching-core NO debe importar genetics-core
 * (anti-patrón explícito del repo), así que la integración con un vertical
 * real se prueba en `@org/genetics-core` en lugar de acá.
 */
const TestVertical: VerticalEngine<{ note: string }> = {
  category: 'GENETICS',
  canHandle: (n) => n.category === 'GENETICS',
  score: () => ({ score: 77, facts: { note: 'vertical de prueba' }, reasons: ['razón del vertical'] }),
};

const need: Need = {
  id: 'need-1',
  farmId: 'farm-a',
  rawText: 'necesito arar 40 ha',
  category: 'MACHINERY',
  what: 'arar',
  where: { lat: -32.9, lng: -63.6, label: 'Río Cuarto' },
  window: { from: '2026-09-15', to: '2026-09-20' },
  constraints: [],
  status: 'OPEN',
  createdAt: '2026-09-12T00:00:00.000Z',
};

const provider: Provider = {
  id: 'prov-1',
  name: 'Contratista',
  type: 'CONTRACTOR',
  base: { lat: -32.9, lng: -63.6, label: 'Río Cuarto' },
  verified: false,
  reputation: { avg: 4, jobs: 10 },
  contact: {},
  source: 'test',
};

const capability: Capability = {
  id: 'cap-1',
  providerId: 'prov-1',
  category: 'MACHINERY',
  serviceType: 'arada',
  coverageRadiusKm: 50,
  availability: [],
  priceModel: 'PER_HA',
  certifications: [],
  attributes: {},
};

describe('matching-core stubs', () => {
  it('hardFilters devuelve todo passed:true (stub)', () => {
    const filters = hardFilters(need, capability, provider);
    expect(filters.every((f) => f.passed)).toBe(true);
  });

  it('scoreCandidate puntúa más alto cuanto más cerca está el proveedor', () => {
    const near = scoreCandidate(need, capability, provider);
    const far = scoreCandidate(need, capability, { ...provider, base: { lat: 10, lng: 10, label: 'lejos' } });
    expect(near.score).toBeGreaterThan(far.score);
  });

  it('matchNeed puntúa por cercanía sin vertical', () => {
    const board = matchNeed(need, [capability], [provider], []);
    expect(board.ranked).toHaveLength(1);
    expect(board.ranked[0].compatibility).toBe(100);
    expect(board.excluded).toEqual([]);
  });

  it('registerVertical + listVerticals registran sin duplicar', () => {
    registerVertical(TestVertical);
    registerVertical(TestVertical);
    expect(listVerticals().filter((v) => v.category === 'GENETICS')).toHaveLength(1);
  });

  it('matchNeed delega en el vertical registrado y expone verticalFacts + fit.vertical en [0,1]', () => {
    const geneticsNeed: Need = { ...need, category: 'GENETICS' };
    const geneticsCap: Capability = {
      id: 'bull-1',
      providerId: 'prov-genetics',
      category: 'GENETICS',
      serviceType: 'semen',
      coverageRadiusKm: 500,
      availability: [],
      priceModel: 'PER_UNIT',
      certifications: [],
      attributes: {},
    };
    const geneticsProvider: Provider = { ...provider, id: 'prov-genetics', type: 'SEMEN_COMPANY' };

    const board = matchNeed(geneticsNeed, [geneticsCap], [geneticsProvider], [TestVertical]);

    expect(board.ranked).toHaveLength(1);
    expect(board.ranked[0].verticalFacts).toEqual({ note: 'vertical de prueba' });
    expect(board.ranked[0].fit.vertical).toBeGreaterThanOrEqual(0);
    expect(board.ranked[0].fit.vertical).toBeLessThanOrEqual(1);
  });
});
