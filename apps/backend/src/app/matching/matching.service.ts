import { Inject, Injectable } from '@nestjs/common';
import { matchNeed } from '@org/matching-core';
import { computeTraitStats, GeneticsVertical, makeGeneticsNeed } from '@org/genetics-core';
import type { BreedingGoal, GenomicProfile, MatchBoard, Need } from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';
import { BULL_REPO, type BullRepo } from '../../repos/bull.port.js';
import { CLASSIFICATION_REPO, type ClassificationRepo } from '../../repos/classification.port.js';
import { FEMALE_REPO, type FemaleRepo } from '../../repos/female.port.js';
import { NEED_REPO, type NeedRepo } from '../../repos/need.port.js';
import { PROVIDER_REPO, type ProviderRepo } from '../../repos/provider.port.js';

/**
 * B4 (ADR-0002): el único lugar donde se llama a `matchNeed` con el vertical
 * genético registrado. Nunca se llama a `scoreCandidates`/`scoreOneCandidate`
 * directo (REQ-D-01).
 */
@Injectable()
export class MatchingService {
  constructor(
    @Inject(FEMALE_REPO) private readonly femaleRepo: FemaleRepo,
    @Inject(CLASSIFICATION_REPO) private readonly classificationRepo: ClassificationRepo,
    @Inject(NEED_REPO) private readonly needRepo: NeedRepo,
    @Inject(BULL_REPO) private readonly bullRepo: BullRepo,
    @Inject(PROVIDER_REPO) private readonly providerRepo: ProviderRepo,
  ) {}

  async getBoard(farmId: string, femaleId: string, goal: BreedingGoal): Promise<MatchBoard> {
    const female = await this.femaleRepo.findById(farmId, femaleId);
    if (!female) {
      throw new DomainError('FEMALE_NOT_FOUND', 'No encontramos esa hembra en el tambo', 404, {
        farmId,
        femaleId,
      });
    }

    const classificationRecord = await this.classificationRepo.listByFarm(farmId);
    const classification = classificationRecord?.items.find((c) => c.femaleId === femaleId);
    if (!classification || classification.semenType === null) {
      throw new DomainError(
        'HERD_NOT_CLASSIFIED',
        'Clasificá el rodeo antes de buscar toros',
        409,
        { farmId, femaleId },
      );
    }

    const need = await this.getOrCreateSyntheticNeed(farmId, femaleId, goal);

    const bulls = (await this.bullRepo.list()).filter((b) =>
      b.semenTypes.includes(classification.semenType as (typeof b.semenTypes)[number]),
    );
    const bullNaabs = new Set(bulls.map((b) => b.naab));

    const [caps, provs] = await Promise.all([
      this.providerRepo
        .listCapabilities({ category: 'GENETICS' })
        .then((all) => all.filter((c) => bullNaabs.has(c.id))),
      this.providerRepo.list({ category: 'GENETICS' }),
    ]);

    const females = await this.femaleRepo.listByFarm(farmId);
    const profiles: GenomicProfile[] = females
      .map((f) => f.profile)
      .filter((p): p is GenomicProfile => p !== null);
    const stats = computeTraitStats(profiles);

    return matchNeed(need, caps, provs, [GeneticsVertical], { female, classification, bulls, stats });
  }

  /** REQ-D-03: el Need sintético se reutiliza por hembra+establecimiento, nunca se duplica. */
  private async getOrCreateSyntheticNeed(
    farmId: string,
    femaleId: string,
    goal: BreedingGoal,
  ): Promise<Need> {
    const id = `synthetic:${farmId}:${femaleId}`;
    const existing = await this.needRepo.findById(id);
    if (existing) {
      // El objetivo puede cambiar entre pedidos ("Procesar" con otro texto): se
      // actualiza el mismo Need en vez de crear uno nuevo.
      if (JSON.stringify(existing.goal) === JSON.stringify(goal)) return existing;
      return this.needRepo.update({ ...existing, goal });
    }
    const need = { ...makeGeneticsNeed(farmId, femaleId, goal), id };
    return this.needRepo.create(need);
  }
}
