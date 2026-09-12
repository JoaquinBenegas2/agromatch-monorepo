/**
 * Control de alucinación (RN-17/RN-18, REQ-D-04): la IA nunca produce un
 * número que no exista en los hechos. Esta función es la que lo verifica —
 * no le pide nada al LLM, solo compara texto contra datos ya calculados por
 * el núcleo genético.
 */

/** Extrae números del texto (coma o punto decimal), ignorando dígitos que
 * forman parte de un código alfanumérico (por ejemplo un NAAB "029HO20544"). */
function extractNumbers(text: string): number[] {
  // Acepta guion ASCII y el signo menos tipográfico "−" (U+2212), que Claude
  // suele usar en español para deltas negativos (ej. "−1,2").
  const matches = text.match(/(?<![a-zA-Z0-9])[-−]?\d+(?:[.,]\d+)?(?![a-zA-Z0-9])/g) ?? [];
  return matches.map((m) => Number(m.replace('−', '-').replace(',', '.')));
}

/** Junta todos los valores numéricos presentes en los hechos, recorriendo
 * objetos anidados (damTraits, expectedProgeny, deltaVsDam, caseinOdds, etc).
 * También extrae números embebidos en strings (ej. el "4012" de un nombre de
 * toro como "Don Rufino 4012"): repetir el nombre no es inventar un dato. */
function collectFactNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number' && Number.isFinite(value)) {
    out.push(value);
  } else if (typeof value === 'string') {
    out.push(...extractNumbers(value));
  } else if (Array.isArray(value)) {
    for (const item of value) collectFactNumbers(item, out);
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectFactNumbers((value as Record<string, unknown>)[key], out);
    }
  }
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface ValidateNumbersResult {
  ok: boolean;
  /** Los números del texto que no aparecen en los hechos (redondeados a 1 decimal). */
  unknown: number[];
}

/**
 * Cada número del texto (con coma o punto decimal) tiene que existir en
 * `facts`, con tolerancia de redondeo a 1 decimal. Si alguno no aparece,
 * `ok: false` y el llamador SHALL caer al texto determinístico (FALLBACK).
 */
export function validateNumbers(text: string, facts: unknown): ValidateNumbersResult {
  const textNumbers = extractNumbers(text);
  if (textNumbers.length === 0) return { ok: true, unknown: [] };

  const factNumbers = new Set(collectFactNumbers(facts).map(round1));
  const unknown = textNumbers.filter((n) => !factNumbers.has(round1(n)));

  return { ok: unknown.length === 0, unknown };
}
