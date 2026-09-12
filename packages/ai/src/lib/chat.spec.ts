import type { HerdQueryTools, LlmClient, LlmPrompt } from '@org/shared-types';
import { GeneticsChatPort } from './chat.js';

function makeLlm(overrides: { completeJson?: unknown; completeText?: LlmClient['completeText'] } = {}): LlmClient {
  return {
    completeJson: (overrides.completeJson ?? vi.fn(async () => ({}))) as LlmClient['completeJson'],
    completeText: overrides.completeText ?? vi.fn(async () => 'texto fijo'),
  };
}

function makeTools(overrides: Partial<HerdQueryTools> = {}): HerdQueryTools {
  return {
    countByTier: vi.fn(async () => ({ ELITE: 42, COMMERCIAL: 178, BEEF: 58, CULL_ALERT: 15 })),
    listFemales: vi.fn(async () => []),
    explainClassification: vi.fn(async () => ['mastitis crónica']),
    ...overrides,
  };
}

describe('GeneticsChatPort (C6, REQ-A-CHAT-01)', () => {
  it('cuando el LLM elige countByTier, lo llama y redacta con esos datos (usedTools la incluye)', async () => {
    const llm = makeLlm({
      completeJson: vi.fn(async () => ({ tool: 'countByTier', tier: null, tag: null, limit: null, femaleId: null })),
    });
    const tools = makeTools();
    const port = new GeneticsChatPort(llm);

    const answer = await port.ask('farm-a', '¿cuántas terneras van a carne?', tools);

    expect(tools.countByTier).toHaveBeenCalledWith('farm-a');
    expect(answer.usedTools).toEqual(['countByTier']);
    expect(llm.completeText).toHaveBeenCalledOnce();
    const textCall = (llm.completeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as LlmPrompt;
    expect(textCall.user).toContain('58');
  });

  it('si la pregunta nombra un tier, el LLM recibe SOLO ese conteo (no puede sumar los cuatro)', async () => {
    const llm = makeLlm({
      completeJson: vi.fn(async () => ({ tool: 'countByTier', tier: 'BEEF', tag: null, limit: null, femaleId: null })),
      completeText: vi.fn(async () => 'Van 58 terneras a carne.'),
    });
    const port = new GeneticsChatPort(llm);

    const answer = await port.ask('farm-a', '¿cuántas terneras van a carne?', makeTools());

    const textCall = (llm.completeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as LlmPrompt;
    expect(textCall.user).toContain('"tier":"BEEF"');
    expect(textCall.user).not.toContain('178');
    expect(answer.text).toBe('Van 58 terneras a carne.');
  });

  it('RN-18: si el LLM escribe un número que no está en el resultado, se responde con el dato crudo', async () => {
    const llm = makeLlm({
      completeJson: vi.fn(async () => ({ tool: 'countByTier', tier: 'BEEF', tag: null, limit: null, femaleId: null })),
      // Suma inventada: 42+178+58+15 = 293, y encima mal sumado.
      completeText: vi.fn(async () => 'Son 291 terneras en total.'),
    });
    const port = new GeneticsChatPort(llm);

    const answer = await port.ask('farm-a', '¿cuántas terneras van a carne?', makeTools());

    expect(answer.text).toBe('58 hembras a carne.');
    expect(answer.usedTools).toEqual(['countByTier']);
  });

  it('cuando el LLM elige listFemales con un tag, pasa el filtro y clampa el límite a 20', async () => {
    const llm = makeLlm({
      completeJson: vi.fn(async () => ({ tool: 'listFemales', tier: null, tag: 'A2_NUCLEUS', limit: 500, femaleId: null })),
    });
    const tools = makeTools();
    const port = new GeneticsChatPort(llm);

    await port.ask('farm-a', '¿cuáles me sirven para vender leche A2?', tools);

    expect(tools.listFemales).toHaveBeenCalledWith('farm-a', { tier: undefined, tag: 'A2_NUCLEUS', limit: 20 });
  });

  it('cuando el LLM no puede usar ninguna herramienta, responde con usedTools vacío y no llama a ninguna', async () => {
    const llm = makeLlm({
      completeJson: vi.fn(async () => ({ tool: null, tier: null, tag: null, limit: null, femaleId: null })),
    });
    const tools = makeTools();
    const port = new GeneticsChatPort(llm);

    const answer = await port.ask('farm-a', '¿qué toro me conviene comprar?', tools);

    expect(answer.usedTools).toEqual([]);
    expect(tools.countByTier).not.toHaveBeenCalled();
    expect(tools.listFemales).not.toHaveBeenCalled();
    expect(tools.explainClassification).not.toHaveBeenCalled();
  });
});
