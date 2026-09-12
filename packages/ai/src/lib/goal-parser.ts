import { z } from 'zod';
import type { BreedingGoal, GoalParserPort, LlmClient } from '@org/shared-types';
import { BreedingGoalSchema } from '@org/shared-types';

const SYSTEM_PROMPT = `Interpretás el objetivo de mejora genética de un tambero argentino, en
español rioplatense. Elegís el preset que mejor describe la intención (BALANCED, SOLIDS_CHEESE,
A2_MILK, VOLUME, HEALTH_LONGEVITY o EFFICIENCY), o CUSTOM si ninguno encaja. Marcás wantBetaA2
si menciona leche A2 o beta-caseína A2/A2. Marcás wantKappaBB si menciona kappa-caseína BB o
"quesera" de forma explícita. En weights poné, para los rasgos que el texto prioriza
(ci, milk, fat, pro, pl, scs, fs, rfi), un número entre 0 y 1 que refleje la importancia relativa
— no hace falta que sumen 1, eso se normaliza después. Dejá afuera los rasgos que no se
mencionan. No calculás nada más.`;

// Sin rawText: eso lo agrega el servicio, no el LLM.
const GoalGuessSchema = BreedingGoalSchema.omit({ rawText: true });

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** REQ-D-15: los pesos siempre terminan sumando 1 (o vacíos), nunca error. */
function normalizeWeights(weights: BreedingGoal['weights']): BreedingGoal['weights'] {
  const entries = Object.entries(weights).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]),
  );
  const clamped = entries.map(([key, value]) => [key, clamp01(value)] as const);
  const total = clamped.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return {};

  return Object.fromEntries(
    clamped.map(([key, value]) => [key, value / total]),
  ) as BreedingGoal['weights'];
}

function fallbackGoal(text: string): BreedingGoal {
  return { preset: 'BALANCED', weights: {}, wantBetaA2: false, wantKappaBB: false, rawText: text };
}

/**
 * C5 — GoalParserPort real. El objetivo en lenguaje natural nunca produce
 * un error: si el LLM falla, cae a BALANCED con el texto original guardado
 * (REQ-D-15).
 */
export class AnthropicGoalParser implements GoalParserPort {
  constructor(private readonly llm: LlmClient) {}

  async parse(text: string): Promise<BreedingGoal> {
    let guess: z.infer<typeof GoalGuessSchema>;
    try {
      guess = await this.llm.completeJson(
        { system: SYSTEM_PROMPT, user: text, maxTokens: 400 },
        GoalGuessSchema,
      );
    } catch {
      return fallbackGoal(text);
    }

    return {
      ...guess,
      weights: normalizeWeights(guess.weights),
      rawText: text,
    };
  }
}
