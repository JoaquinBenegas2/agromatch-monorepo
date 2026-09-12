import type { ChatAnswer, ChatPort, HerdQueryTools, LlmClient } from '@org/shared-types';
import { TagSchema, TierSchema } from '@org/shared-types';
import { z } from 'zod';
import { validateNumbers } from './validate-numbers.js';

/**
 * C6 (REQ-A-CHAT-01): el LLM decide cuál de exactamente tres herramientas
 * invocar. `LlmClient` no expone selección de herramientas de uso general
 * (D5 solo da `completeJson`/`completeText`), así que se resuelve en dos
 * pasos sobre ese mismo puerto: 1) `completeJson` con un esquema de
 * decisión estricto elige la herramienta (o `null`); 2) se ejecuta esa
 * herramienta contra los repositorios y `completeText` redacta la
 * respuesta **solo** con ese resultado (RN-17).
 */

const ToolChoiceSchema = z.object({
  tool: z.enum(['countByTier', 'listFemales', 'explainClassification']).nullable(),
  tier: TierSchema.nullable(),
  tag: TagSchema.nullable(),
  limit: z.number().nullable(),
  femaleId: z.string().nullable(),
});

const CHOICE_SYSTEM_PROMPT = `Sos el asistente de Torinder. Tenés EXACTAMENTE tres herramientas para responder preguntas sobre el rodeo de un tambo:
- countByTier: cuenta cuántas hembras hay en cada tier (ELITE, COMMERCIAL, BEEF, CULL_ALERT). Si la pregunta nombra un tier (por ejemplo "a carne" = BEEF, "élite" = ELITE, "comerciales" = COMMERCIAL, "descarte" = CULL_ALERT) completá tier con ese valor; si pide toda la distribución, tier en null.
- listFemales: lista hembras, opcionalmente filtradas por tier o tag (A2_NUCLEUS, CHEESE_BB, MASTITIS_RISK, SHORT_LIFE, NO_SIRE, GOAL_PROTECTED). limit máximo 20.
- explainClassification: explica por qué una hembra puntual (por su visualId/caravana) quedó en su tier.
Elegí la herramienta que responde la pregunta y completá solo los argumentos que necesita (el resto en null). Si la pregunta no se puede responder con ninguna de las tres (por ejemplo, pedir una recomendación de compra o armar un plan), devolvé tool: null.`;

const ANSWER_SYSTEM_PROMPT = `Sos el asistente de Torinder. Redactá una respuesta breve en español rioplatense usando SOLO los datos que te paso a continuación. Esos datos son el resultado de la herramienta que responde la pregunta: SIEMPRE respondé con ellos y nunca digas que no tenés datos si el JSON no está vacío. Si el JSON trae motivos ("reasons"), percentiles o umbrales, esa es la explicación: repetila con tus palabras. Nunca inventes un número que no esté en esos datos. No armes planes ni recomendaciones de acción.`;

const FALLBACK_SYSTEM_PROMPT = `Sos el asistente de Torinder. La pregunta no se puede responder con las herramientas disponibles (contar por tier, listar hembras, explicar una clasificación). Decilo en una línea, en español rioplatense, y sugerí dónde sí se puede ver eso (el swipe de toros o el plan de servicios) si aplica. No inventes datos.`;

async function runTool(
  choice: z.infer<typeof ToolChoiceSchema>,
  farmId: string,
  tools: HerdQueryTools,
): Promise<unknown> {
  switch (choice.tool) {
    case 'countByTier': {
      const counts = await tools.countByTier(farmId);
      // Si la pregunta es por un tier puntual ("¿cuántas van a carne?"), el
      // LLM recibe SOLO ese número: con los cuatro a la vista tendía a sumarlos.
      return choice.tier ? { tier: choice.tier, count: counts[choice.tier] } : counts;
    }
    case 'listFemales':
      return tools.listFemales(farmId, {
        tier: choice.tier ?? undefined,
        tag: choice.tag ?? undefined,
        limit: choice.limit ? Math.min(choice.limit, 20) : undefined,
      });
    case 'explainClassification':
      return tools.explainClassification(farmId, choice.femaleId ?? '');
    default:
      return null;
  }
}

/** C6: `ChatPort` real sobre `LlmClient` (D5), con exactamente tres herramientas. */
export class GeneticsChatPort implements ChatPort {
  constructor(private readonly llm: LlmClient) {}

  async ask(farmId: string, question: string, tools: HerdQueryTools): Promise<ChatAnswer> {
    const choice = await this.llm.completeJson(
      { system: CHOICE_SYSTEM_PROMPT, user: question },
      ToolChoiceSchema,
    );

    if (!choice.tool) {
      const text = await this.llm.completeText({ system: FALLBACK_SYSTEM_PROMPT, user: question });
      return { text, usedTools: [] };
    }

    const result = await runTool(choice, farmId, tools);
    const text = await this.llm.completeText({
      system: ANSWER_SYSTEM_PROMPT,
      user: `Pregunta: ${question}\n\nDatos (JSON, la única fuente de números permitida):\n${JSON.stringify(result)}`,
    });
    // RN-18 también acá: un número que no está en el resultado de la
    // herramienta (una suma, un redondeo) descarta la redacción y se muestra
    // el dato crudo, que nunca miente.
    if (!validateNumbers(text, result).ok) {
      return { text: deterministicAnswer(choice.tool, result), usedTools: [choice.tool] };
    }
    return { text, usedTools: [choice.tool] };
  }
}

const TIER_LABEL: Record<string, string> = {
  ELITE: 'élite',
  COMMERCIAL: 'comerciales',
  BEEF: 'a carne',
  CULL_ALERT: 'en alerta de descarte',
};

/** Texto determinístico por herramienta, sin LLM: solo repite el resultado. */
function deterministicAnswer(tool: NonNullable<z.infer<typeof ToolChoiceSchema>['tool']>, result: unknown): string {
  if (tool === 'countByTier' && result && typeof result === 'object') {
    if ('tier' in result && 'count' in result) {
      const { tier, count } = result as { tier: string; count: number };
      return `${count} hembras ${TIER_LABEL[tier] ?? tier}.`;
    }
    const counts = result as Record<string, number>;
    return Object.entries(counts)
      .map(([tier, count]) => `${TIER_LABEL[tier] ?? tier}: ${count}`)
      .join(' · ');
  }
  if (tool === 'explainClassification' && Array.isArray(result)) return result.join(' ');
  if (tool === 'listFemales' && Array.isArray(result)) {
    const ids = result.map((f) => (f && typeof f === 'object' && 'visualId' in f ? String((f as { visualId: unknown }).visualId) : '')).filter(Boolean);
    return ids.length ? `${ids.length} hembras: ${ids.join(', ')}.` : 'Ninguna hembra cumple ese filtro.';
  }
  return JSON.stringify(result);
}
