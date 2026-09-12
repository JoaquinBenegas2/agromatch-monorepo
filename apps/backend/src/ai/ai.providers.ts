import type { Provider } from '@nestjs/common';
import type { ChatPort, LlmClient, LlmPrompt, NeedIntakePort } from '@org/shared-types';
import {
  AiNeedIntake,
  AnthropicExplainer,
  AnthropicGoalParser,
  AnthropicLlmClient,
  AnthropicMarketExplainer,
  GeneticsChatPort,
  HerdIngestion,
  LlmUnavailableError,
} from '@org/ai';
import type { ZodType } from 'zod';
import {
  FakeHerdIngestion,
  FakeLlmClient,
  FakeNeedIntake,
} from '@org/shared-types/testing';
import {
  CHAT_PORT,
  EXPLAINER_PORT,
  GOAL_PARSER_PORT,
  HERD_INGESTION_PORT,
  LLM_CLIENT,
  MARKET_EXPLAINER_PORT,
  NEED_INTAKE_PORT,
} from './tokens.js';

function isLive(): boolean {
  return (process.env['AI_MODE'] ?? 'live') === 'live';
}

/**
 * `AnthropicLlmClient` valida `ANTHROPIC_API_KEY` en su constructor
 * (REQ-LC-05). Nest instancia todos los providers de un módulo al arrancar,
 * así que construirlo ahí rompería REQ-AK-05 ("arranca en live sin clave").
 * Este wrapper difiere la construcción hasta el primer uso real.
 */
function createLazyLiveLlmClient(): LlmClient {
  let client: LlmClient | null = null;
  const get = (): LlmClient => {
    if (client) return client;
    try {
      client = new AnthropicLlmClient();
    } catch (err) {
      // Sin ANTHROPIC_API_KEY el constructor lanza un Error plano: se traduce
      // a LlmUnavailableError para que el filtro global responda 502
      // LLM_UNAVAILABLE con el motivo, y no un 500 INTERNAL_ERROR opaco.
      throw new LlmUnavailableError(err);
    }
    return client;
  };
  return {
    completeJson: <T>(prompt: LlmPrompt, schema: ZodType<T>) => get().completeJson(prompt, schema),
    completeText: (prompt: LlmPrompt) => get().completeText(prompt),
  };
}

/**
 * Único archivo de registro del módulo `ai` (REQ-AK-05): cada dev cambia acá
 * la línea de su puerto cuando publica el adaptador real. Mientras no exista
 * un adaptador real, `live` resuelve al fake sin fallar.
 */
export const AI_PROVIDERS: Provider[] = [
  {
    provide: LLM_CLIENT,
    useFactory: (): LlmClient => (isLive() ? createLazyLiveLlmClient() : FakeLlmClient),
  },
  // EXPLAINER_PORT: real de mvp-d-match (C4).
  {
    provide: EXPLAINER_PORT,
    useFactory: (llm: LlmClient) => new AnthropicExplainer(llm),
    inject: [LLM_CLIENT],
  },
  // MARKET_EXPLAINER_PORT: flujo B (necesidad → proveedor).
  {
    provide: MARKET_EXPLAINER_PORT,
    useFactory: (llm: LlmClient) => new AnthropicMarketExplainer(llm),
    inject: [LLM_CLIENT],
  },
  // GOAL_PARSER_PORT: real de mvp-d-match (C5).
  {
    provide: GOAL_PARSER_PORT,
    useFactory: (llm: LlmClient) => new AnthropicGoalParser(llm),
    inject: [LLM_CLIENT],
  },
  // HERD_INGESTION_PORT: real de mvp-c-herd (C2).
  {
    provide: HERD_INGESTION_PORT,
    inject: [LLM_CLIENT],
    useFactory: (llm: LlmClient) =>
      isLive() ? new HerdIngestion(llm) : FakeHerdIngestion,
  },
  {
    provide: NEED_INTAKE_PORT,
    inject: [LLM_CLIENT],
    useFactory: (llm: LlmClient): NeedIntakePort =>
      isLive() ? new AiNeedIntake(llm) : FakeNeedIntake,
  },
  // CHAT_PORT: real de mvp-a-core (C6, anexo del chat).
  {
    provide: CHAT_PORT,
    useFactory: (llm: LlmClient): ChatPort => new GeneticsChatPort(llm),
    inject: [LLM_CLIENT],
  },
];
