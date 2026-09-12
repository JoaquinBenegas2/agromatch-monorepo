import type { ZodType } from 'zod';
import type {
  BreedingGoal,
  Explanation,
  ExplanationFacts,
  GoalPreset,
} from '../src/domain.js';
import type { Need, NeedIntakePort } from '../src/marketplace.js';
import type {
  CatalogIngestionPort,
  ChatAnswer,
  ChatPort,
  ExplainerPort,
  GoalParserPort,
  HerdIngestionPort,
  HerdQueryTools,
  LlmClient,
  LlmPrompt,
  MappingProposal,
} from '../src/ports.js';
import { bullsSeed, needsSamples, herdFarmA, samples } from '../fixtures/index.js';

/**
 * Sustitutos deterministas de cada puerto (REQ-SC-07). No hacen red, no leen
 * `ANTHROPIC_API_KEY`, y siempre devuelven lo mismo para la misma entrada.
 */

export const FakeHerdIngestion: HerdIngestionPort = {
  async proposeMapping(): Promise<MappingProposal> {
    return samples.mappingProposal;
  },
  async applyMapping() {
    return { ...samples.herdImportResult, females: herdFarmA.females };
  },
};

export const FakeCatalogIngestion: CatalogIngestionPort = {
  async extract() {
    return { bulls: bullsSeed, rowsRejected: [], warnings: [] };
  },
};

export const FakeExplainer: ExplainerPort = {
  async explain(facts: ExplanationFacts): Promise<Explanation> {
    return { text: facts.reasons.join(' '), source: 'FALLBACK' };
  },
};

const GOAL_KEYWORDS: Array<{ match: RegExp; preset: GoalPreset }> = [
  { match: /(sólidos|solidos|queso)/i, preset: 'SOLIDS_CHEESE' },
  { match: /a2/i, preset: 'A2_MILK' },
  { match: /(leche|litros)/i, preset: 'VOLUME' },
  { match: /(salud|mastitis|vida)/i, preset: 'HEALTH_LONGEVITY' },
  { match: /eficiencia/i, preset: 'EFFICIENCY' },
];

const GOAL_WEIGHTS: Record<GoalPreset, BreedingGoal['weights']> = {
  BALANCED: { ci: 0.4, milk: 0.2, fat: 0.1, pro: 0.1, pl: 0.1, scs: 0.1 },
  SOLIDS_CHEESE: { fat: 0.35, pro: 0.35, pl: 0.15, scs: 0.15 },
  A2_MILK: { ci: 0.5, milk: 0.3, pl: 0.2 },
  VOLUME: { milk: 0.6, ci: 0.3, pl: 0.1 },
  HEALTH_LONGEVITY: { pl: 0.4, scs: 0.4, ci: 0.2 },
  EFFICIENCY: { rfi: 0.5, ci: 0.3, milk: 0.2 },
};

export const FakeGoalParser: GoalParserPort = {
  async parse(text: string): Promise<BreedingGoal> {
    const found = GOAL_KEYWORDS.find(({ match }) => match.test(text));
    const preset = found?.preset ?? 'BALANCED';
    return {
      preset,
      weights: GOAL_WEIGHTS[preset],
      wantBetaA2: preset === 'A2_MILK',
      wantKappaBB: preset === 'SOLIDS_CHEESE',
      rawText: text,
    };
  },
};

export const FakeNeedIntake: NeedIntakePort = {
  async parse(rawText: string, farmId: string): Promise<Need> {
    const known = needsSamples.find((sample) => sample.rawText === rawText);
    if (known) return known.need;

    return {
      id: `need-draft-${Date.now()}`,
      farmId,
      rawText,
      category: 'OTHER',
      what: rawText,
      constraints: [],
      status: 'DRAFT',
      missingFields: ['category', 'what', 'where', 'window'],
      createdAt: new Date().toISOString(),
    };
  },
};

export const FakeChat: ChatPort = {
  async ask(farmId: string, _question: string, tools: HerdQueryTools): Promise<ChatAnswer> {
    const counts = await tools.countByTier(farmId);
    const text = Object.entries(counts)
      .map(([tier, count]) => `${tier}: ${count}`)
      .join(', ');
    return { text, usedTools: ['countByTier'] };
  },
};

const DEFAULT_GOAL: BreedingGoal = {
  preset: 'BALANCED',
  weights: { ci: 0.4, milk: 0.2, fat: 0.1, pro: 0.1, pl: 0.1, scs: 0.1 },
  wantBetaA2: false,
  wantKappaBB: false,
};

/** Candidatos, en orden: el primero que valide contra el esquema pedido se usa. */
const SAMPLE_CANDIDATES: unknown[] = [
  samples.needDraft.goal ?? DEFAULT_GOAL,
  samples.mappingProposal,
  samples.chatAnswer,
  samples.explanation,
  samples.explanationFacts,
  samples.classificationSummary,
  samples.breedingPlan,
  samples.chatToolChoice,
  DEFAULT_GOAL,
];

/**
 * `completeJson` devuelve el primer ejemplo de `samples/` que valide contra
 * el esquema pedido; `completeText` devuelve un texto fijo.
 */
export const FakeLlmClient: LlmClient = {
  async completeJson<T>(_prompt: LlmPrompt, schema: ZodType<T>): Promise<T> {
    for (const candidate of SAMPLE_CANDIDATES) {
      const result = schema.safeParse(candidate);
      if (result.success) return result.data;
    }
    throw new Error(
      'FakeLlmClient: ningún sample de shared-types/fixtures valida contra el esquema pedido',
    );
  },
  async completeText(): Promise<string> {
    return 'Respuesta fija del cliente LLM simulado (AI_MODE=fake).';
  },
};
