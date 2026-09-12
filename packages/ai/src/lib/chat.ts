import type { ChatAnswer, ChatPort, HerdQueryTools, LlmClient } from '@org/shared-types';
import { TagSchema, TierSchema } from '@org/shared-types';
import { z } from 'zod';

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
- countByTier: cuenta cuántas hembras hay en cada tier (ELITE, COMMERCIAL, BEEF, CULL_ALERT). No pide argumentos.
- listFemales: lista hembras, opcionalmente filtradas por tier o tag (A2_NUCLEUS, CHEESE_BB, MASTITIS_RISK, SHORT_LIFE, NO_SIRE, GOAL_PROTECTED). limit máximo 20.
- explainClassification: explica por qué una hembra puntual (por su visualId/caravana) quedó en su tier.
Elegí la herramienta que responde la pregunta y completá solo los argumentos que necesita (el resto en null). Si la pregunta no se puede responder con ninguna de las tres (por ejemplo, pedir una recomendación de compra o armar un plan), devolvé tool: null.`;

const ANSWER_SYSTEM_PROMPT = `Sos el asistente de Torinder. Redactá una respuesta breve en español rioplatense usando SOLO los datos que te paso a continuación. Nunca inventes un número que no esté en esos datos. No armes planes ni recomendaciones de acción.`;

const FALLBACK_SYSTEM_PROMPT = `Sos el asistente de Torinder. La pregunta no se puede responder con las herramientas disponibles (contar por tier, listar hembras, explicar una clasificación). Decilo en una línea, en español rioplatense, y sugerí dónde sí se puede ver eso (el swipe de toros o el plan de servicios) si aplica. No inventes datos.`;

async function runTool(
  choice: z.infer<typeof ToolChoiceSchema>,
  farmId: string,
  tools: HerdQueryTools,
): Promise<unknown> {
  switch (choice.tool) {
    case 'countByTier':
      return tools.countByTier(farmId);
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
    return { text, usedTools: [choice.tool] };
  }
}
