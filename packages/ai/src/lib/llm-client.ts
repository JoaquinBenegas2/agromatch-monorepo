import Anthropic, { APIConnectionError, APIConnectionTimeoutError } from '@anthropic-ai/sdk';
import { z, type ZodType } from 'zod';
import type { LlmClient, LlmPrompt } from '@org/shared-types';
import { InMemoryCache } from './cache.js';
import { LlmSchemaMismatchError, LlmUnavailableError } from './errors.js';

const MODEL = 'claude-haiku-4-5';
const TOOL_NAME = 'respond';

function toJsonSchema(schema: ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
  delete jsonSchema['$schema'];
  return jsonSchema;
}

async function withNetworkRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isNetworkError(err)) {
      try {
        return await run();
      } catch (retryErr) {
        throw new LlmUnavailableError(retryErr);
      }
    }
    throw err;
  }
}

function isNetworkError(err: unknown): boolean {
  return err instanceof APIConnectionError || err instanceof APIConnectionTimeoutError;
}

/**
 * `AnthropicLlmClient` — el único punto de contacto con Claude (D5). Nadie
 * más importa `@anthropic-ai/sdk`.
 */
export class AnthropicLlmClient implements LlmClient {
  private readonly client: Anthropic;
  private readonly jsonCache = new InMemoryCache<unknown>();
  private readonly textCache = new InMemoryCache<string>();

  constructor(apiKey = process.env['ANTHROPIC_API_KEY']) {
    if (!apiKey) {
      throw new Error(
        'Falta la variable de entorno ANTHROPIC_API_KEY: es obligatoria para AI_MODE=live',
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async completeJson<T>(prompt: LlmPrompt, schema: ZodType<T>): Promise<T> {
    const schemaJson = toJsonSchema(schema);
    const cacheKey = this.jsonCache.key({
      model: MODEL,
      system: prompt.system,
      user: prompt.user,
      schema: schemaJson,
    });

    const result = await this.jsonCache.getOrCompute(cacheKey, () =>
      this.completeJsonUncached(prompt, schema, schemaJson),
    );
    return result as T;
  }

  private async completeJsonUncached<T>(
    prompt: LlmPrompt,
    schema: ZodType<T>,
    schemaJson: Record<string, unknown>,
  ): Promise<T> {
    const attempt = () => this.callTool(prompt, schemaJson);

    const first = await withNetworkRetry(attempt);
    const firstResult = schema.safeParse(first);
    if (firstResult.success) return firstResult.data;

    const second = await withNetworkRetry(attempt);
    const secondResult = schema.safeParse(second);
    if (secondResult.success) return secondResult.data;

    throw new LlmSchemaMismatchError(secondResult.error.issues);
  }

  private async callTool(prompt: LlmPrompt, schemaJson: Record<string, unknown>): Promise<unknown> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: prompt.maxTokens ?? 1024,
      system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: prompt.user }],
      tools: [
        {
          name: TOOL_NAME,
          description: 'Devuelve la respuesta estructurada exactamente con este esquema.',
          input_schema: schemaJson as Anthropic.Tool.InputSchema,
          strict: true,
        },
      ],
      tool_choice: { type: 'tool', name: TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    return toolUse?.input ?? {};
  }

  async completeText(prompt: LlmPrompt): Promise<string> {
    const cacheKey = this.textCache.key({ model: MODEL, system: prompt.system, user: prompt.user });

    return this.textCache.getOrCompute(cacheKey, () =>
      withNetworkRetry(async () => {
        const response = await this.client.messages.create({
          model: MODEL,
          max_tokens: prompt.maxTokens ?? 1024,
          system: [{ type: 'text', text: prompt.system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: prompt.user }],
        });
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === 'text',
        );
        return textBlock?.text ?? '';
      }),
    );
  }
}
