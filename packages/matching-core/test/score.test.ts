import type { Capability, Need, Provider } from '@org/shared-types';
import { scoreCandidate } from '../src/score.js';

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

const capability: Capability = {
  id: 'cap-1',
  providerId: 'prov-1',
  category: 'MACHINERY',
  serviceType: 'arada',
  coverageRadiusKm: 200,
  availability: [],
  priceModel: 'PER_HA',
  certifications: [],
  attributes: {},
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

describe('scoreCandidate (RN-32, REQ-A-02)', () => {
  it('puntúa más alto cuanto más cerca está el proveedor', () => {
    const near = scoreCandidate(need, capability, makeProvider());
    const far = scoreCandidate(need, capability, makeProvider({ base: { lat: 10, lng: 10, label: 'lejos' } }));
    expect(near.score).toBeGreaterThan(far.score);
  });

  it('sin reputación puntúa reputation:0 y lo dice en reasons, nunca un promedio', () => {
    const result = scoreCandidate(need, capability, makeProvider({ reputation: { avg: null, jobs: 0 } }));
    expect(result.fit.reputation).toBe(0);
    expect(result.reasons.some((r) => r.toLowerCase().includes('valoracion'))).toBe(true);
  });

  it('sin LLM: no depende de ningún puerto de IA', () => {
    const source = scoreCandidate.toString();
    expect(source).not.toMatch(/anthropic|LlmClient/i);
  });
});
