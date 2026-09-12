import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  ExplanationFactsSchema,
  type ContactGeneticMatch,
  type User,
} from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';
import { PLAN_REPO, type PlanRepo } from '../../repos/plan.port.js';
import { NEED_REPO, type NeedRepo } from '../../repos/need.port.js';
import {
  NEGOTIATION_REPO,
  type NegotiationRepo,
} from '../../repos/negotiation.port.js';
import { RequestsService } from '../requests/requests.service.js';
import { GeneticMatchingService } from './genetic-matching.service.js';

@Injectable()
export class MatchContactService {
  constructor(
    @Inject(PLAN_REPO) private readonly plans: PlanRepo,
    @Inject(NEED_REPO) private readonly needs: NeedRepo,
    @Inject(NEGOTIATION_REPO) private readonly negotiations: NegotiationRepo,
    private readonly matching: GeneticMatchingService,
    private readonly requests: RequestsService,
  ) {}
  async contact(
    farmId: string,
    femaleId: string,
    naab: string,
    body: ContactGeneticMatch,
    user: User,
  ) {
    const plan = await this.plans.getOrCreate(farmId);
    if (!plan.items.some((i) => i.femaleId === femaleId && i.bullNaab === naab))
      throw new DomainError(
        'MATCH_NOT_SELECTED',
        'Guardá este encuentro en tu plan antes de contactar al proveedor.',
        409,
      );
    const board = await this.matching.getBoard(farmId, femaleId, body.goal);
    const candidate = board.ranked.find((c) => c.capabilityId === naab);
    const facts = ExplanationFactsSchema.safeParse(candidate?.verticalFacts);
    if (!candidate || !facts.success)
      throw new DomainError(
        'CANDIDATE_NOT_ELIGIBLE',
        'El encuentro ya no es elegible. Revisalo antes de contactar.',
        409,
      );
    // A stable, separate need keeps the selected pair and its original goal in the final chat.
    const needId =
      'contact:' +
      createHash('sha256')
        .update(JSON.stringify([farmId, femaleId, naab, candidate.providerId]))
        .digest('hex');
    const existing = (
      await this.negotiations.list({
        needIds: [needId],
        providerId: candidate.providerId,
      })
    )[0];
    if (existing) {
      const { messages: _messages, ...request } = existing;
      return request;
    }
    if (!(await this.needs.findById(needId))) {
      const source = await this.needs.findById(candidate.needId);
      if (!source)
        throw new DomainError(
          'NEED_NOT_FOUND',
          'No encontramos el contexto del encuentro.',
          404,
        );
      await this.needs.create({
        ...source,
        id: needId,
        goal: body.goal,
        what: `Torinder · Vaca ${facts.data.femaleVisualId} × ${facts.data.bull.name} (${naab})`,
        rawText: `Vaca ${facts.data.femaleVisualId}; toro ${naab}; objetivo ${body.goal.preset}; semen ${facts.data.semenType}; compatibilidad ${candidate.compatibility}.`,
      });
    }
    return this.requests.create(
      needId,
      {
        providerId: candidate.providerId,
        message: `Vaca ${facts.data.femaleVisualId} × ${facts.data.bull.name} · Objetivo: ${body.goal.preset} · Semen: ${facts.data.semenType}\n\n${body.message}`,
      },
      user,
    );
  }
}
