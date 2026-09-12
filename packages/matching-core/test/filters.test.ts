import type { Capability, Need, Provider } from '@org/shared-types';
import { hardFilters } from '../src/filters.js';

function makeNeed(overrides: Partial<Need> = {}): Need {
  return {
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
    ...overrides,
  };
}

function makeCapability(overrides: Partial<Capability> = {}): Capability {
  return {
    id: 'cap-1',
    providerId: 'prov-1',
    category: 'MACHINERY',
    serviceType: 'arada',
    coverageRadiusKm: 100,
    availability: [],
    priceModel: 'PER_HA',
    certifications: [],
    attributes: {},
    ...overrides,
  };
}

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

describe('hardFilters (RN-31, REQ-A-01)', () => {
  it('fuera de cobertura: 180 km con coverageRadiusKm 120 -> excluido', () => {
    const need = makeNeed();
    const cap = makeCapability({ coverageRadiusKm: 120 });
    const prov = makeProvider({ base: { lat: -34.5, lng: -63.6, label: 'lejos' } }); // ~178km north-south approx
    const results = hardFilters(need, cap, prov);
    const coverage = results.find((r) => r.detail.includes('cobertura'));
    expect(coverage?.passed).toBe(false);
  });

  it('capacidad insuficiente: 40 ha en 5 días vs 5 ha/día -> excluido', () => {
    const need = makeNeed({ magnitude: { value: 40, unit: 'HA' }, window: { from: '2026-09-15', to: '2026-09-20' } });
    const cap = makeCapability({ capacityPerDay: { value: 5, unit: 'HA' } });
    const results = hardFilters(need, cap, makeProvider());
    const capacity = results.find((r) => r.detail.includes('Capacidad'));
    expect(capacity?.passed).toBe(false);
    expect(capacity?.detail).toContain('25');
  });

  it('sin superposición de ventanas -> excluido', () => {
    const need = makeNeed({ window: { from: '2026-09-10', to: '2026-09-15' } });
    const cap = makeCapability({ availability: [{ from: '2026-09-20', to: '2026-09-30' }] });
    const results = hardFilters(need, cap, makeProvider());
    const availability = results.find((r) => r.detail.includes('disponibilidad'));
    expect(availability?.passed).toBe(false);
  });

  it('todo pasa: proveedor cerca, disponible y con capacidad de sobra', () => {
    const need = makeNeed({ magnitude: { value: 10, unit: 'HA' } });
    const cap = makeCapability({
      coverageRadiusKm: 100,
      availability: [{ from: '2026-09-14', to: '2026-09-22' }],
      capacityPerDay: { value: 20, unit: 'HA' },
    });
    const results = hardFilters(need, cap, makeProvider());
    expect(results.every((r) => r.passed)).toBe(true);
  });
});
