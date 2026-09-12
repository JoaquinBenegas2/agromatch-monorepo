import { z } from 'zod';
import { vi, type Mock } from 'vitest';

const createMock: Mock = vi.fn();

vi.mock('@anthropic-ai/sdk', async () => {
  const actual = await vi.importActual<typeof import('@anthropic-ai/sdk')>('@anthropic-ai/sdk');
  class FakeAnthropic {
    messages = { create: createMock };
  }
  return { ...actual, default: FakeAnthropic };
});

const { AnthropicLlmClient } = await import('./llm-client.js');
const { LlmSchemaMismatchError, LlmUnavailableError } = await import('./errors.js');
const { APIConnectionError } = await import('@anthropic-ai/sdk');

const GoalSchema = z.object({ preset: z.string(), weights: z.object({ ci: z.number().optional() }) });

function textResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

function toolResponse(input: unknown) {
  return { content: [{ type: 'tool_use', id: 'x', name: 'respond', input }] };
}

beforeEach(() => {
  createMock.mockReset();
});

describe('AnthropicLlmClient (REQ-LC-01..06)', () => {
  it('construye sin clave falla con mensaje en español', () => {
    // `''` y no `undefined`: con undefined el parámetro por defecto lee
    // process.env, y Nx inyecta el .env raíz (con clave) al correr los tests.
    expect(() => new AnthropicLlmClient('')).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('completeJson devuelve el objeto tipado cuando la respuesta valida', async () => {
    createMock.mockResolvedValueOnce(toolResponse({ preset: 'BALANCED', weights: { ci: 0.4 } }));
    const client = new AnthropicLlmClient('test-key');
    const result = await client.completeJson({ system: 's', user: 'u' }, GoalSchema);
    expect(result).toEqual({ preset: 'BALANCED', weights: { ci: 0.4 } });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('JSON inválido dos veces produce 2 llamadas y LlmSchemaMismatchError (REQ-LC-01)', async () => {
    createMock.mockResolvedValue(toolResponse({ preset: 'BALANCED', weights: { ci: 'not-a-number' } }));
    const client = new AnthropicLlmClient('test-key');
    await expect(client.completeJson({ system: 's', user: 'u2' }, GoalSchema)).rejects.toThrow(
      LlmSchemaMismatchError,
    );
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('dos llamadas idénticas a completeText producen una sola invocación al SDK (REQ-LC-02)', async () => {
    createMock.mockResolvedValue(textResponse('hola'));
    const client = new AnthropicLlmClient('test-key');
    const prompt = { system: 's', user: 'u3' };
    const [a, b] = await Promise.all([client.completeText(prompt), client.completeText(prompt)]);
    expect(a).toBe('hola');
    expect(b).toBe('hola');
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('un prompt distinto produce una llamada nueva', async () => {
    createMock.mockResolvedValue(textResponse('hola'));
    const client = new AnthropicLlmClient('test-key');
    await client.completeText({ system: 's', user: 'u4a' });
    await client.completeText({ system: 's', user: 'u4b' });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it('el request lleva cache_control en system y model claude-haiku-4-5 sin thinking (REQ-LC-03/04)', async () => {
    createMock.mockResolvedValue(textResponse('hola'));
    const client = new AnthropicLlmClient('test-key');
    await client.completeText({ system: 's', user: 'u5' });

    const request = createMock.mock.calls[0][0];
    expect(request.model).toBe('claude-haiku-4-5');
    expect(request.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(request.thinking).toBeUndefined();
    expect(request.output_config).toBeUndefined();
  });

  it('el proveedor caído en las dos llamadas lanza LlmUnavailableError (REQ-LC-06)', async () => {
    createMock.mockImplementation(() => {
      throw new APIConnectionError({ message: 'network down' });
    });
    const client = new AnthropicLlmClient('test-key');
    await expect(client.completeText({ system: 's', user: 'u6' })).rejects.toThrow(LlmUnavailableError);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
