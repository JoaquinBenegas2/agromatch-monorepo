import type { LlmClient } from '@org/shared-types';
import { AnthropicGoalParser } from './goal-parser.js';

function fakeLlm(guess: () => Promise<unknown>): LlmClient {
  return {
    completeJson: (async () => guess()) as LlmClient['completeJson'],
    completeText: async () => '',
  };
}

describe('AnthropicGoalParser (C5, REQ-D-15)', () => {
  it('leche A2 para vender a la industria → wantBetaA2, conserva rawText', async () => {
    const llm = fakeLlm(async () => ({
      preset: 'A2_MILK',
      weights: {},
      wantBetaA2: true,
      wantKappaBB: false,
    }));
    const parser = new AnthropicGoalParser(llm);
    const goal = await parser.parse('leche A2 para vender a la industria');
    expect(goal.wantBetaA2).toBe(true);
    expect(goal.rawText).toBe('leche A2 para vender a la industria');
  });

  it('pesos que no suman 1 se normalizan, nunca fallan', async () => {
    const llm = fakeLlm(async () => ({
      preset: 'CUSTOM',
      weights: { pro: 0.5, fat: 0.5, scs: 0.5 },
      wantBetaA2: false,
      wantKappaBB: false,
    }));
    const parser = new AnthropicGoalParser(llm);
    const goal = await parser.parse('quiero de todo un poco');
    const sum = Object.values(goal.weights).reduce((a, b) => a + (b ?? 0), 0);
    expect(sum).toBeCloseTo(1, 3);
    expect(goal.weights.pro).toBeCloseTo(1 / 3, 3);
  });

  it('pesos vacíos → quedan vacíos, no inventa valores', async () => {
    const llm = fakeLlm(async () => ({
      preset: 'BALANCED',
      weights: {},
      wantBetaA2: false,
      wantKappaBB: false,
    }));
    const parser = new AnthropicGoalParser(llm);
    const goal = await parser.parse('lo que venga bien');
    expect(goal.weights).toEqual({});
  });

  it('un peso negativo o fuera de rango se recorta a [0,1] antes de normalizar', async () => {
    const llm = fakeLlm(async () => ({
      preset: 'CUSTOM',
      weights: { scs: -5, pro: 1 },
      wantBetaA2: false,
      wantKappaBB: false,
    }));
    const parser = new AnthropicGoalParser(llm);
    const goal = await parser.parse('texto');
    // scs se recorta a 0, pro a 1 -> normalizado, pro queda en 1 y scs en 0
    expect(goal.weights.pro).toBeCloseTo(1, 3);
    expect(goal.weights.scs ?? 0).toBeCloseTo(0, 3);
  });

  it('el LLM falla → cae a BALANCED con el texto original, nunca lanza', async () => {
    const llm = fakeLlm(async () => {
      throw new Error('Claude no está disponible en este momento');
    });
    const parser = new AnthropicGoalParser(llm);
    const goal = await parser.parse('mejorar sólidos');
    expect(goal.preset).toBe('BALANCED');
    expect(goal.rawText).toBe('mejorar sólidos');
  });
});
