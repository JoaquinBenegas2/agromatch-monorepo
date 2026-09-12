import type { LlmClient } from '@org/shared-types';
import { AnthropicExplainer } from './explainer.js';

const facts = {
  femaleVisualId: '3031',
  femaleCategory: 'COMMERCIAL' as const,
  tier: 'COMERCIAL' as const,
  corrective: ['scs'] as const,
  goal: { preset: 'SOLIDS_CHEESE' as const, weights: {}, wantBetaA2: false, wantKappaBB: false },
  bull: { naab: '029HO20544', name: 'Don Rufino 4012', company: 'Cabaña La Esperanza', breed: 'Holstein' as const },
  semenType: 'SEXED' as const,
  damTraits: { scs: 3.19 },
  expectedProgeny: { scs: 2.95 },
  deltaVsDam: { scs: -0.24 },
  caseinOdds: { betaA2A2: 0.5, kappaBB: null },
  compatibility: 100,
  rank: 1,
  totalCandidates: 12,
  reasons: ['Baja el SCS de 3,19 a 2,95, corrigiendo la mastitis de la madre.'],
} as unknown as Parameters<AnthropicExplainer['explain']>[0];

function fakeLlm(completeText: LlmClient['completeText']): LlmClient {
  return { completeText, completeJson: async () => ({}) as never };
}

describe('AnthropicExplainer (C4, RN-17/RN-18, REQ-D-04)', () => {
  it('texto válido, todos los números existen en los hechos → source AI', async () => {
    const llm = fakeLlm(async () => 'El SCS de la cría esperada baja de 3,19 a 2,95, corrigiendo la mastitis de 3031.');
    const explainer = new AnthropicExplainer(llm);
    const result = await explainer.explain(facts);
    expect(result.source).toBe('AI');
    expect(result.text).toContain('mastitis');
  });

  it('un número que no está en los hechos → FALLBACK con el texto determinístico', async () => {
    const llm = fakeLlm(async () => 'El SCS proyectado queda en 2,70.');
    const explainer = new AnthropicExplainer(llm);
    const result = await explainer.explain(facts);
    expect(result.source).toBe('FALLBACK');
    expect(result.text).toBe(facts.reasons.join(' '));
  });

  it('el LLM lanza (no disponible) → FALLBACK, nunca propaga el error', async () => {
    const llm = fakeLlm(async () => {
      throw new Error('Claude no está disponible en este momento');
    });
    const explainer = new AnthropicExplainer(llm);
    const result = await explainer.explain(facts);
    expect(result.source).toBe('FALLBACK');
  });

  it('coma y punto decimal mezclados, ambos existen → source AI', async () => {
    const llm = fakeLlm(async () => 'Mejora de 3,19 a 2.95 en SCS.');
    const explainer = new AnthropicExplainer(llm);
    const result = await explainer.explain(facts);
    expect(result.source).toBe('AI');
  });

  it('el prompt del sistema prohíbe explícitamente calcular o inventar valores', async () => {
    let sentSystem = '';
    const llm = fakeLlm(async (prompt) => {
      sentSystem = prompt.system;
      return 'listo';
    });
    await new AnthropicExplainer(llm).explain(facts);
    expect(sentSystem.toLowerCase()).toMatch(/nunca calcul|invent/);
  });
});
