import type { Explanation, LlmClient, MarketExplainerPort, MarketExplanationFacts } from '@org/shared-types';
import { validateNumbers } from './validate-numbers.js';

const SYSTEM_PROMPT = `Sos el redactor de AgroMatch para el mercado de necesidad↔proveedor.
Escribís en español rioplatense, de 2 a 3 oraciones, sin jerga técnica.
Explicás por qué un proveedor conviene para la necesidad de un productor, usando
exclusivamente los números y datos que te paso — nunca calculás, estimás ni
inventás un valor nuevo. Copiá cada número exactamente como te llega (mismos
decimales, sin redondear): un número que no esté literal en los datos descarta
toda tu respuesta. Si un dato es null o no está, no lo mencionás. No uses
markdown ni listas: texto corrido.`;

function factsToPrompt(facts: MarketExplanationFacts): string {
  const lines: string[] = [
    `Necesidad: ${facts.need.what} (categoría ${facts.need.category}).`,
    facts.need.magnitude ? `Cantidad pedida: ${facts.need.magnitude.value} ${facts.need.magnitude.unit}.` : '',
    `Proveedor: ${facts.provider.name}, base en ${facts.provider.baseLabel}.`,
    facts.distanceKm !== undefined ? `Distancia: ${facts.distanceKm} km.` : '',
    `Ranking: #${facts.rank} de ${facts.totalCandidates}, compatibilidad ${facts.compatibility}.`,
    `Ajuste (0 a 1): cercanía ${facts.fit.proximity}, disponibilidad ${facts.fit.availability}, capacidad ${facts.fit.capacity}, precio ${facts.fit.price}, reputación ${facts.fit.reputation}.`,
    facts.reasons.length ? `Motivos ya calculados: ${facts.reasons.join('; ')}.` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function fallback(facts: MarketExplanationFacts): Explanation {
  return { text: facts.reasons.join(' ') || 'Sin motivos calculados para este candidato.', source: 'FALLBACK' };
}

/**
 * Flujo B (necesidad → proveedor) — análogo a `AnthropicExplainer` pero
 * sobre `MarketExplanationFacts`. Nunca le pide al LLM que calcule: solo
 * redacta, y cada número del texto se valida contra los hechos antes de
 * mostrarse (RN-17/RN-18). Si algo no cierra o Claude no responde, cae
 * siempre al texto determinístico (`reasons`), nunca a un error.
 */
export class AnthropicMarketExplainer implements MarketExplainerPort {
  constructor(private readonly llm: LlmClient) {}

  async explain(facts: MarketExplanationFacts): Promise<Explanation> {
    let text: string;
    try {
      text = await this.llm.completeText({
        system: SYSTEM_PROMPT,
        user: factsToPrompt(facts),
        maxTokens: 220,
      });
    } catch {
      return fallback(facts);
    }

    const { ok } = validateNumbers(text, facts);
    if (!ok || !text.trim()) return fallback(facts);

    return { text: text.trim(), source: 'AI' };
  }
}
