import { randomUUID } from 'node:crypto';
import {
  BreedingGoalSchema,
  GeoPointSchema,
  MagnitudeSchema,
  NeedCategorySchema,
  NeedSchema,
  TimeWindowSchema,
  type LlmClient,
  type LlmPrompt,
  type Need,
  type NeedIntakePort,
} from '@org/shared-types';
import { z } from 'zod';

const confidence = z.number().min(0).max(1);

/** Salida que Claude interpreta; identidad, estado y trazabilidad pertenecen a la aplicación. */
export const NeedIntakeOutputSchema = z.object({
  category: NeedCategorySchema,
  what: z.string().min(1),
  where: GeoPointSchema.optional(),
  radiusKm: z.number().positive().optional(),
  window: TimeWindowSchema.optional(),
  magnitude: MagnitudeSchema.optional(),
  constraints: z.array(z.string()),
  budget: z.number().nonnegative().optional(),
  goal: BreedingGoalSchema.optional(),
  confidence: z.object({
    category: confidence,
    what: confidence,
    where: confidence.optional(),
    radiusKm: confidence.optional(),
    window: confidence.optional(),
    magnitude: confidence.optional(),
    constraints: confidence,
    budget: confidence.optional(),
    goal: confidence.optional(),
  }),
});

type NeedIntakeOutput = z.infer<typeof NeedIntakeOutputSchema>;

const SYSTEM_PROMPT = `Sos el intake estructurado de AgroMatch para productores argentinos.

Convertí únicamente lo que el usuario dijo en una necesidad. No calcules rankings ni recomiendes proveedores.

Reglas obligatorias:
- Nunca inventes lugar ni fecha. Si no aparecen en el texto, omití por completo where o window.
- Si el texto nombra una localidad, provincia o zona (por ejemplo "Río Cuarto", "Rafaela", "cuenca de Villa María"), SIEMPRE devolvé where con sus coordenadas aproximadas (lat/lng en grados decimales, Argentina tiene lat y lng negativas) y el nombre tal como lo dijo en where.label. Reflejá en confidence.where cuánta certeza tenés sobre las coordenadas; no omitas where por dudar de los decimales.
- Si el texto dice cuándo ("la semana que viene", "mañana", "en octubre", "urgente"), SIEMPRE devolvé window en formato YYYY-MM-DD a partir de la fecha actual recibida. "La semana que viene" son siete días consecutivos empezando el próximo lunes; "urgente" o "cuanto antes" son los próximos tres días; un mes nombrado es ese mes completo.
- Conservá cada número y unidad. Normalizá hectáreas a HA, cabezas a HEAD, toneladas a TON, unidades a UNIT y visitas a VISIT.
- category usa uno de MACHINERY, VET, INPUTS, ADVISORY, SOFTWARE, FINANCE, GENETICS u OTHER.
- En GENETICS, interpretá el objetivo con BreedingGoal. Para mejorar sólidos usá SOLIDS_CHEESE y hacé dominar fat/pro; wantKappaBB debe ser true.
- confidence mide de 0 a 1 cuánto respaldo tiene cada campo en el texto. Incluí confianza para cada campo que devuelvas.
- constraints contiene solo restricciones expresadas, sin completar prácticas habituales.

Ejemplos:
1. "necesito un veterinario" => category VET, what "atención veterinaria", constraints [], sin where, sin window.
2. "el toro de mi vecino le anda bien a las vaquillonas, quiero mejorar sólidos" => category GENETICS, goal SOLIDS_CHEESE con fat y pro dominantes, sin where y sin window.
3. Con fecha actual 2026-09-12, "necesito quien me are 40 ha en Río Cuarto la semana que viene" => category MACHINERY, what "arada", magnitude { value: 40, unit: "HA" }, where { lat: -33.123, lng: -64.349, label: "Río Cuarto" }, window { from: "2026-09-14", to: "2026-09-20" }, confidence { category: 0.95, what: 0.95, magnitude: 0.95, where: 0.85, window: 0.8, constraints: 0.9 }.
4. Con fecha actual 2026-09-12, "necesito veterinario para el rodeo, control reproductivo urgente" => category VET, what "control reproductivo del rodeo", constraints ["urgente"], sin where (no nombra lugar), window { from: "2026-09-12", to: "2026-09-14" }.`;

function buildPrompt(rawText: string, today: string): LlmPrompt {
  return {
    system: SYSTEM_PROMPT,
    user: `Fecha actual: ${today}\nTexto del productor: ${JSON.stringify(rawText)}`,
    maxTokens: 900,
  };
}

function missingFields(output: NeedIntakeOutput): string[] {
  const missing: string[] = [];
  if (!output.where) missing.push('where');
  if (!output.window) missing.push('window');
  return missing;
}

export class AiNeedIntake implements NeedIntakePort {
  constructor(
    private readonly llm: LlmClient,
    private readonly now: () => Date = () => new Date(),
    private readonly makeId: () => string = randomUUID,
  ) {}

  async parse(rawText: string, farmId: string): Promise<Need> {
    const timestamp = this.now();
    const output = await this.llm.completeJson(
      buildPrompt(rawText, timestamp.toISOString().slice(0, 10)),
      NeedIntakeOutputSchema,
    );
    const missing = missingFields(output);

    return NeedSchema.parse({
      id: `need-${this.makeId()}`,
      farmId,
      rawText,
      category: output.category,
      what: output.what,
      where: output.where,
      radiusKm: output.radiusKm,
      window: output.window,
      magnitude: output.magnitude,
      constraints: output.constraints,
      budget: output.budget,
      status: 'DRAFT',
      goal: output.goal,
      createdAt: timestamp.toISOString(),
      missingFields: missing.length > 0 ? missing : undefined,
      confidence: output.confidence,
    });
  }
}
