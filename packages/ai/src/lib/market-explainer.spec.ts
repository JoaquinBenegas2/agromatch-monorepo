import type { LlmClient } from '@org/shared-types';
import { AnthropicMarketExplainer } from './market-explainer.js';

const facts = {
  need: { what: 'arada', category: 'MACHINERY' as const, magnitude: { value: 40, unit: 'HA' as const } },
  provider: { name: 'Nicola Hnos.', baseLabel: 'Berrotarán, Córdoba' },
  distanceKm: 74.89,
  rank: 1,
  totalCandidates: 3,
  compatibility: 100,
  fit: { proximity: 0.38, availability: 1, capacity: 1, price: 1, reputation: 0 },
  reasons: ['A 74.9 km de distancia, dentro del radio de cobertura de 120 km'],
} as unknown as Parameters<AnthropicMarketExplainer['explain']>[0];

function fakeLlm(completeText: LlmClient['completeText']): LlmClient {
  return { completeText, completeJson: async () => ({}) as never };
}

describe('AnthropicMarketExplainer (flujo B, RN-17/RN-18)', () => {
  it('texto válido, todos los números existen en los hechos → source AI', async () => {
    const llm = fakeLlm(async () => 'Nicola Hnos. está a 74.89 km, dentro de su radio de cobertura.');
    const explainer = new AnthropicMarketExplainer(llm);
    const result = await explainer.explain(facts);
    expect(result.source).toBe('AI');
    expect(result.text).toContain('Nicola Hnos.');
  });

  it('un número que no está en los hechos → FALLBACK con el texto determinístico', async () => {
    const llm = fakeLlm(async () => 'Está a 50 km de distancia.');
    const explainer = new AnthropicMarketExplainer(llm);
    const result = await explainer.explain(facts);
    expect(result.source).toBe('FALLBACK');
    expect(result.text).toBe(facts.reasons.join(' '));
  });

  it('el LLM lanza (no disponible) → FALLBACK, nunca propaga el error', async () => {
    const llm = fakeLlm(async () => {
      throw new Error('Claude no está disponible en este momento');
    });
    const explainer = new AnthropicMarketExplainer(llm);
    const result = await explainer.explain(facts);
    expect(result.source).toBe('FALLBACK');
  });

  it('el prompt del sistema prohíbe explícitamente calcular o inventar valores', async () => {
    let sentSystem = '';
    const llm = fakeLlm(async (prompt) => {
      sentSystem = prompt.system;
      return 'listo';
    });
    await new AnthropicMarketExplainer(llm).explain(facts);
    expect(sentSystem.toLowerCase()).toMatch(/nunca calcul|invent/);
  });
});
