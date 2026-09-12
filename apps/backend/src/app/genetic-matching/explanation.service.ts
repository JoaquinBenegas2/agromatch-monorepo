import { Inject, Injectable } from '@nestjs/common';
import { InMemoryCache } from '@org/ai';
import type { BreedingGoal, Explanation, ExplanationFacts, ExplainerPort } from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';
import { EXPLAINER_PORT } from '../../ai/tokens.js';
import { GeneticMatchingService } from './genetic-matching.service.js';

/**
 * B4 — REQ-D-05: la explicación se cachea por hash de `ExplanationFacts`, no
 * por hembra/toro/objetivo, para que dos pedidos con los mismos hechos
 * reutilicen la misma respuesta sin invocar de nuevo al `ExplainerPort`.
 */
@Injectable()
export class ExplanationService {
  private readonly cache = new InMemoryCache<Explanation>();

  constructor(
    @Inject(EXPLAINER_PORT) private readonly explainer: ExplainerPort,
    private readonly matchingService: GeneticMatchingService,
  ) {}

  async getExplanation(
    farmId: string,
    femaleId: string,
    naab: string,
    goal: BreedingGoal,
  ): Promise<Explanation> {
    const board = await this.matchingService.getBoard(farmId, femaleId, goal);
    const candidate = [...board.ranked, ...board.excluded].find((c) => c.capabilityId === naab);
    if (!candidate) {
      throw new DomainError('BULL_NOT_FOUND', 'No encontramos ese toro en el matching', 404, {
        farmId,
        femaleId,
        naab,
      });
    }

    const facts = candidate.verticalFacts as ExplanationFacts;
    const key = this.cache.key(facts as unknown as Record<string, unknown>);
    return this.cache.getOrCompute(key, () => this.explainer.explain(facts));
  }
}
