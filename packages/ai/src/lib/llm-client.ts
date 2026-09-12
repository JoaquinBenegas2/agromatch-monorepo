import Anthropic, { APIConnectionError, APIConnectionTimeoutError } from '@anthropic-ai/sdk';
import { z, type ZodType } from 'zod';
import type { LlmClient, LlmPrompt } from '@org/shared-types';
import { InMemoryCache } from './cache.js';
import { LlmSchemaMismatchError, LlmUnavailableError } from './errors.js';

const MODEL = 'claude-haiku-4-5';
const TOOL_NAME = 'respond';

/**
 * Palabras clave de JSON Schema que la API de Anthropic no admite en
 * herramientas `strict: true` (devuelve 400 "property 'exclusiveMinimum' is
 * not supported"). Zod las emite para `.positive()`, `.min()`, `.max()`,
 * `.int()`, etc. Se quitan del esquema enviado; la validación real la sigue
 * haciendo `schema.safeParse` sobre la respuesta (RN-18), así que no se
 * pierde ninguna restricción.
 */
const UNSUPPORTED_SCHEMA_KEYWORDS = new Set([
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minimum',
  'maximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'pattern',
  'minItems',
  'maxItems',
  'uniqueItems',
]);

type JsonSchema = Record<string, unknown>;

/**
 * Convierte el esquema de Zod al que acepta una herramienta `strict: true`:
 * quita las palabras clave no admitidas y, en el objeto raíz, vuelve
 * obligatorias todas las propiedades, aceptando `null` en las que eran
 * opcionales. En modo estricto Haiku 4.5 omitía sistemáticamente las
 * propiedades opcionales de primer nivel (devolvía la necesidad sin
 * `where`/`window` aunque el texto dijera "Río Cuarto la semana que viene");
 * la forma documentada es "requerido + nulable" y `pruneOptionalNulls`
 * deshace el `null` antes de validar con Zod. Solo se aplica en la raíz
 * porque la API limita a 16 los parámetros con unión: hacerlo en los
 * anidados (pesos parciales, confianzas por campo) supera ese tope.
 */
function toStrictSchema(node: unknown, isRoot = false): unknown {
  if (Array.isArray(node)) return node.map((item) => toStrictSchema(item));
  if (!node || typeof node !== 'object') return node;
  const source = node as JsonSchema;
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(source)) {
    if (UNSUPPORTED_SCHEMA_KEYWORDS.has(key)) continue;
    result[key] = toStrictSchema(value);
  }
  if (isRoot && result['type'] === 'object' && result['properties'] && typeof result['properties'] === 'object') {
    const properties = result['properties'] as JsonSchema;
    const required = new Set((source['required'] as string[] | undefined) ?? []);
    for (const key of Object.keys(properties)) {
      if (!required.has(key)) properties[key] = { anyOf: [properties[key], { type: 'null' }] };
    }
    result['required'] = Object.keys(properties);
  }
  return result;
}

/** Quita los `null` que el modelo puso en propiedades que Zod declara opcionales. */
function pruneOptionalNulls(value: unknown, schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return value;
  const node = schema as JsonSchema;
  if (Array.isArray(value)) return node['items'] ? value.map((item) => pruneOptionalNulls(item, node['items'])) : value;
  if (value && typeof value === 'object' && node['properties'] && typeof node['properties'] === 'object') {
    const properties = node['properties'] as JsonSchema;
    const required = new Set((node['required'] as string[] | undefined) ?? []);
    const result: JsonSchema = {};
    for (const [key, item] of Object.entries(value as JsonSchema)) {
      if (item === null && key in properties && !required.has(key)) continue;
      result[key] = pruneOptionalNulls(item, properties[key]);
    }
    return result;
  }
  return value;
}

interface PreparedSchema {
  /** Tal como lo emite Zod: es la referencia para saber qué era opcional. */
  original: JsonSchema;
  /** El que viaja a la API en la herramienta `strict`. */
  strict: JsonSchema;
}

function toJsonSchema(schema: ZodType): PreparedSchema {
  const original = z.toJSONSchema(schema, { target: 'draft-7' }) as JsonSchema;
  delete original['$schema'];
  return { original, strict: toStrictSchema(original, true) as JsonSchema };
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
      schema: schemaJson.strict,
    });

    const result = await this.jsonCache.getOrCompute(cacheKey, () =>
      this.completeJsonUncached(prompt, schema, schemaJson),
    );
    return result as T;
  }

  private async completeJsonUncached<T>(
    prompt: LlmPrompt,
    schema: ZodType<T>,
    schemaJson: PreparedSchema,
  ): Promise<T> {
    const attempt = async () =>
      pruneOptionalNulls(await this.callTool(prompt, schemaJson.strict), schemaJson.original);

    const first = await withNetworkRetry(attempt);
    const firstResult = schema.safeParse(first);
    if (firstResult.success) return firstResult.data;

    const second = await withNetworkRetry(attempt);
    const secondResult = schema.safeParse(second);
    if (secondResult.success) return secondResult.data;

    throw new LlmSchemaMismatchError(secondResult.error.issues);
  }

  private async callTool(prompt: LlmPrompt, schemaJson: JsonSchema): Promise<unknown> {
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
