import { z } from 'zod';
import {
  FakeChat,
  FakeExplainer,
  FakeGoalParser,
  FakeHerdIngestion,
  FakeLlmClient,
  FakeNeedIntake,
} from './fakes.js';
import { ChatAnswerSchema } from '../src/schemas.js';

describe('fakes (REQ-SC-07): deterministas, sin red', () => {
  it('FakeExplainer devuelve reasons.join sin llamar a ningún LLM', async () => {
    const facts = {
      reasons: ['razón uno', 'razón dos'],
    } as unknown as Parameters<typeof FakeExplainer.explain>[0];
    const result = await FakeExplainer.explain(facts);
    expect(result).toEqual({ text: 'razón uno razón dos', source: 'FALLBACK' });
  });

  it('FakeNeedIntake con texto conocido devuelve la versión estructurada', async () => {
    const result = await FakeNeedIntake.parse(
      'necesito quien me are 40 ha en Río Cuarto la semana que viene',
      'farm-a',
    );
    expect(result.category).toBe('MACHINERY');
    expect(result.magnitude).toEqual({ value: 40, unit: 'HA' });
    expect(result.status).toBe('DRAFT');
  });

  it('FakeNeedIntake con texto desconocido devuelve DRAFT con missingFields', async () => {
    const result = await FakeNeedIntake.parse('un texto que no está en los samples', 'farm-a');
    expect(result.status).toBe('DRAFT');
    expect(result.missingFields?.length).toBeGreaterThan(0);
  });

  it('FakeGoalParser mapea palabras clave a presets', async () => {
    expect((await FakeGoalParser.parse('quiero mejorar los sólidos')).preset).toBe(
      'SOLIDS_CHEESE',
    );
    expect((await FakeGoalParser.parse('busco leche A2')).preset).toBe('A2_MILK');
    expect((await FakeGoalParser.parse('más litros de leche')).preset).toBe('VOLUME');
    expect((await FakeGoalParser.parse('cuidar la salud del rodeo')).preset).toBe(
      'HEALTH_LONGEVITY',
    );
    expect((await FakeGoalParser.parse('mejorar la eficiencia')).preset).toBe('EFFICIENCY');
    expect((await FakeGoalParser.parse('algo genérico')).preset).toBe('BALANCED');
  });

  it('FakeHerdIngestion.proposeMapping devuelve el mapeo con confianza 1 en los campos clave', async () => {
    const proposal = await FakeHerdIngestion.proposeMapping(new Uint8Array(), 'rodeo.xlsx');
    expect(proposal.confidence['Caravana']).toBe(1);
  });

  it('FakeChat llama a countByTier y responde con el conteo', async () => {
    const tools = {
      countByTier: async () => ({ ELITE: 1, COMMERCIAL: 2, BEEF: 0, CULL_ALERT: 0 }),
      listFemales: async () => [],
      explainClassification: async () => [],
    };
    const answer = await FakeChat.ask('farm-a', '¿cuántas hembras tengo?', tools);
    expect(answer.usedTools).toEqual(['countByTier']);
    expect(answer.text).toContain('ELITE: 1');
  });

  it('FakeLlmClient.completeJson no hace red y valida contra el esquema pedido', async () => {
    const result = await FakeLlmClient.completeJson(
      { system: 'sys', user: 'user' },
      ChatAnswerSchema,
    );
    expect(() => ChatAnswerSchema.parse(result)).not.toThrow();
  });

  it('FakeLlmClient.completeJson lanza si ningún sample valida contra el esquema', async () => {
    const impossibleSchema = z.object({ campoQueNoExisteEnNingunSample: z.literal('x') });
    await expect(
      FakeLlmClient.completeJson({ system: 's', user: 'u' }, impossibleSchema),
    ).rejects.toThrow();
  });

  it('FakeLlmClient.completeText devuelve un texto fijo sin red', async () => {
    const text = await FakeLlmClient.completeText({ system: 's', user: 'u' });
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });
});
