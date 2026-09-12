import type { Capability, ExplanationFacts, FilterResult, Need, Provider, VerticalEngine } from '@org/shared-types';
import { matchNeed } from '../src/score.js';
import { listVerticals, registerVertical } from '../src/registry.js';

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

function makeProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    id: 'prov-1',
    name: 'Contratista',
    type: 'CONTRACTOR',
    base: { lat: -32.9, lng: -63.6, label: 'Río Cuarto' },
    verified: false,
    reputation: { avg: 4, jobs: 10 },
    contact: {},
    source: 'test',
    ...overrides,
  };
}

function makeCapability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: 'cap-1',
    providerId: 'prov-1',
    category: 'MACHINERY',
    serviceType: 'arada',
    coverageRadiusKm: 200,
    availability: [],
    priceModel: 'PER_HA',
    certifications: [],
    attributes: {},
    ...overrides,
  };
}

describe('matchNeed genérico (RN-33, REQ-A-02)', () => {
  it('el más cercano, disponible y mejor calificado sale #1 con compatibility 100', () => {
    const caps = [
      makeCapability({ id: 'cap-near', providerId: 'prov-near' }),
      makeCapability({ id: 'cap-far', providerId: 'prov-far' }),
      makeCapability({ id: 'cap-no-rep', providerId: 'prov-no-rep' }),
    ];
    const provs = [
      makeProvider({ id: 'prov-near', base: { lat: -32.9, lng: -63.6, label: 'cerca' }, reputation: { avg: 4.8, jobs: 20 } }),
      makeProvider({ id: 'prov-far', base: { lat: -33.9, lng: -64.6, label: 'lejos' } }),
      makeProvider({ id: 'prov-no-rep', reputation: { avg: null, jobs: 0 } }),
    ];

    const board = matchNeed(need, caps, provs, []);

    expect(board.ranked).toHaveLength(3);
    expect(board.ranked[0].capabilityId).toBe('cap-near');
    expect(board.ranked[0].compatibility).toBe(100);
    board.ranked.forEach((c) => {
      expect(c.compatibility).toBeGreaterThanOrEqual(0);
      expect(c.compatibility).toBeLessThanOrEqual(100);
    });
    expect(board.ranked.map((c) => c.rank)).toEqual([1, 2, 3]);
    const noRep = board.ranked.find((c) => c.providerId === 'prov-no-rep');
    expect(noRep?.reasons.some((r) => r.toLowerCase().includes('valoracion'))).toBe(true);
  });

  it('un solo candidato -> compatibility 100', () => {
    const board = matchNeed(need, [makeCapability()], [makeProvider()], []);
    expect(board.ranked).toHaveLength(1);
    expect(board.ranked[0].compatibility).toBe(100);
  });
});

describe('matchNeed con vertical registrado (RN-35, ADR-0002)', () => {
  const geneticsNeed: Need = { ...need, category: 'GENETICS' };

  it('llama a score una vez por candidato y guarda verticalFacts + fit.vertical', () => {
    let calls = 0;
    const TestVertical: VerticalEngine<{ note: string }> = {
      category: 'GENETICS',
      canHandle: (n) => n.category === 'GENETICS',
      score: () => {
        calls += 1;
        return { score: 77, facts: { note: 'vertical de prueba' }, reasons: ['razón del vertical'] };
      },
    };
    const cap = makeCapability({ id: 'bull-1', providerId: 'prov-genetics', category: 'GENETICS' });
    const prov = makeProvider({ id: 'prov-genetics', type: 'SEMEN_COMPANY' });

    const board = matchNeed(geneticsNeed, [cap], [prov], [TestVertical]);

    expect(calls).toBe(1);
    expect(board.ranked).toHaveLength(1);
    // El núcleo enriquece los facts del vertical con la posición relativa
    // (rank, totalCandidates, compatibility) para el badge "#1 de N" (regla 5).
    expect(board.ranked[0].verticalFacts).toMatchObject({ note: 'vertical de prueba', rank: 1, totalCandidates: 1, compatibility: 100 });
    expect(board.ranked[0].fit.vertical).toBeGreaterThanOrEqual(0);
    expect(board.ranked[0].fit.vertical).toBeLessThanOrEqual(1);
  });

  it('un candidato que el vertical excluye (-Infinity) va a excluded con los filters del vertical', () => {
    const rejectedFilters: FilterResult[] = [{ rule: 'RN-13', passed: false, detail: 'no ofrece semen sexado' }];
    const ExcludingVertical: VerticalEngine<Partial<ExplanationFacts>> = {
      category: 'GENETICS',
      canHandle: (n) => n.category === 'GENETICS',
      score: () => ({
        score: -Infinity,
        facts: { filters: rejectedFilters } as unknown as ExplanationFacts,
        reasons: ['no ofrece semen sexado'],
      }),
    };
    const cap = makeCapability({ id: 'bull-1', providerId: 'prov-genetics', category: 'GENETICS' });
    const prov = makeProvider({ id: 'prov-genetics', type: 'SEMEN_COMPANY' });

    const board = matchNeed(geneticsNeed, [cap], [prov], [ExcludingVertical]);

    expect(board.ranked).toHaveLength(0);
    expect(board.excluded).toHaveLength(1);
    expect(board.excluded[0].filters).toEqual(rejectedFilters);
    expect(board.excluded[0].reasons.join(' ')).toContain('no ofrece semen sexado');
  });

  it('sin vertical para la categoría: canHandle devuelve false y no hay verticalFacts', () => {
    const TestVertical: VerticalEngine<{ note: string }> = {
      category: 'GENETICS',
      canHandle: (n) => n.category === 'GENETICS',
      score: () => ({ score: 77, facts: { note: 'vertical' }, reasons: [] }),
    };
    const board = matchNeed(need, [makeCapability()], [makeProvider()], [TestVertical]);
    expect(board.ranked[0].verticalFacts).toBeUndefined();
  });
});

describe('necesidad sin geografía (RN-31: el filtro que no aplica no descarta)', () => {
  // Una pajuela de semen viaja por correo: la necesidad genética no declara
  // `where` ni `window`. Antes se rellenaban con {lat:0,lng:0} y el núcleo
  // descartaba el catálogo entero por distancia.
  const noGeoNeed: Need = { ...need, where: undefined, window: undefined };

  it('no descarta a nadie por cobertura ni por disponibilidad, y lo dice en el detalle', () => {
    const cap = makeCapability({ coverageRadiusKm: 1, availability: [{ from: '1999-01-01', to: '1999-01-02' }] });
    const prov = makeProvider({ base: { lat: 60.1, lng: 24.9, label: 'Helsinki' } });

    const board = matchNeed(noGeoNeed, [cap], [prov], []);

    expect(board.excluded).toHaveLength(0);
    expect(board.ranked).toHaveLength(1);
    const details = board.ranked[0].filters.map((f) => f.detail).join(' | ');
    expect(details).toContain('no declara ubicación');
    expect(details).toContain('no declara ventana');
  });

  it('la distancia no mueve el puntaje: dos proveedores iguales salvo por su base empatan', () => {
    const caps = [makeCapability({ id: 'cap-cerca', providerId: 'prov-cerca' }), makeCapability({ id: 'cap-lejos', providerId: 'prov-lejos' })];
    const provs = [
      makeProvider({ id: 'prov-cerca', base: { lat: -32.9, lng: -63.6, label: 'Río Cuarto' } }),
      makeProvider({ id: 'prov-lejos', base: { lat: 60.1, lng: 24.9, label: 'Helsinki' } }),
    ];

    const board = matchNeed(noGeoNeed, caps, provs, []);

    expect(board.ranked).toHaveLength(2);
    expect(board.ranked[0].score).toBe(board.ranked[1].score);
    // El término de cercanía se renormaliza (no se cuenta como 0): con
    // availability, capacity y price en 1 y reputación 4/5, el score vive
    // muy por encima del 65 que daría contar la cercanía como cero.
    expect(board.ranked[0].score).toBeCloseTo(95.38, 1);
    expect(board.ranked[0].reasons.join(' ')).toContain('no depende de la ubicación');
  });

  it('una necesidad en DRAFT sigue sin poder matchearse (RN-30)', () => {
    expect(() => matchNeed({ ...noGeoNeed, status: 'DRAFT' }, [makeCapability()], [makeProvider()], [])).toThrow(/DRAFT/);
  });
});

describe('registerVertical + listVerticals (RN-35)', () => {
  it('registran sin duplicar por categoría', () => {
    const TestVertical: VerticalEngine<{ note: string }> = {
      category: 'VET',
      canHandle: (n) => n.category === 'VET',
      score: () => ({ score: 1, facts: { note: 'x' }, reasons: [] }),
    };
    registerVertical(TestVertical);
    registerVertical(TestVertical);
    expect(listVerticals().filter((v) => v.category === 'VET')).toHaveLength(1);
  });
});
