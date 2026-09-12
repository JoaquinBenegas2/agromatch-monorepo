import type { Explanation, ExplanationFacts, ExplainerPort, LlmClient } from '@org/shared-types';
import { validateNumbers } from './validate-numbers.js';

const SYSTEM_PROMPT = `Sos un asesor genético de tambos argentinos. Redactás en español
rioplatense, de 3 a 4 oraciones, sin jerga técnica ni anglicismos. Explicás por qué un
toro conviene para una hembra puntual, usando exclusivamente los números y datos que te
paso — nunca calculás, estimás ni inventás un valor nuevo. Si un dato es null o no está,
no lo mencionás. No uses markdown ni listas: texto corrido.`;

function factsToPrompt(facts: ExplanationFacts): string {
  const lines: string[] = [
    `Hembra ${facts.femaleVisualId} (${facts.femaleCategory}, tier ${facts.tier}).`,
    `Objetivo: ${facts.goal.preset}${facts.goal.rawText ? ` ("${facts.goal.rawText}")` : ''}.`,
    `Corrige: ${facts.corrective.join(', ') || 'nada puntual'}.`,
    `Toro: ${facts.bull.name} (${facts.bull.company}, ${facts.bull.breed}), semen ${facts.semenType}.`,
    `Ranking: #${facts.rank} de ${facts.totalCandidates}, compatibilidad ${facts.compatibility}.`,
  ];
  if (facts.damTraits && facts.expectedProgeny) {
    for (const key of Object.keys(facts.expectedProgeny) as (keyof typeof facts.expectedProgeny)[]) {
      const from = facts.damTraits[key];
      const to = facts.expectedProgeny[key];
      if (from != null && to != null) lines.push(`${key}: madre ${from} → cría esperada ${to}.`);
    }
  }
  if (facts.caseinOdds.betaA2A2 != null) lines.push(`Probabilidad A2/A2 en la cría: ${facts.caseinOdds.betaA2A2}.`);
  if (facts.caseinOdds.kappaBB != null) lines.push(`Probabilidad kappa-caseína BB en la cría: ${facts.caseinOdds.kappaBB}.`);
  if (facts.reasons.length) lines.push(`Motivos ya calculados: ${facts.reasons.join('; ')}.`);
  return lines.join('\n');
}

function fallback(facts: ExplanationFacts): Explanation {
  return { text: facts.reasons.join(' ') || 'Sin motivos calculados para este candidato.', source: 'FALLBACK' };
}

/**
 * C4 — ExplainerPort real. Nunca le pide al LLM que calcule: solo redacta
 * sobre `ExplanationFacts`, y cada número del texto se valida contra esos
 * hechos antes de mostrarse (RN-17/RN-18). Si algo no cierra o Claude no
 * responde, cae siempre al texto determinístico (`reasons`), nunca a un
 * error — el endpoint responde 200 con `source: 'FALLBACK'`.
 */
export class AnthropicExplainer implements ExplainerPort {
  constructor(private readonly llm: LlmClient) {}

  async explain(facts: ExplanationFacts): Promise<Explanation> {
    let text: string;
    try {
      text = await this.llm.completeText({
        system: SYSTEM_PROMPT,
        user: factsToPrompt(facts),
        maxTokens: 300,
      });
    } catch {
      return fallback(facts);
    }

    const { ok } = validateNumbers(text, facts);
    if (!ok || !text.trim()) return fallback(facts);

    return { text: text.trim(), source: 'AI' };
  }
}
