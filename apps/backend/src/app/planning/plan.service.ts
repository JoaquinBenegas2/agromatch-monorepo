import { Inject, Injectable } from '@nestjs/common';
import { buildAutoPlan } from '@org/genetics-core';
import { computeTraitStats } from '@org/genetics-core';
import type { BreedingGoal, BreedingPlan, GenomicProfile, PlanItem, SemenType } from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';
import { BULL_REPO, type BullRepo } from '../../repos/bull.port.js';
import { CLASSIFICATION_REPO, type ClassificationRepo } from '../../repos/classification.port.js';
import { FARM_REPO, type FarmRepo } from '../../repos/farm.port.js';
import { FEMALE_REPO, type FemaleRepo } from '../../repos/female.port.js';
import { PLAN_REPO, type PlanRepo } from '../../repos/plan.port.js';

const EMPTY_DOSES: Record<SemenType, number> = { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 };

/** B5 — Plan de servicios: alta/baja manual (REQ-D-12), plan automático
 * (REQ-D-10) y totales recalculados en el server (REQ-D-11). */
@Injectable()
export class PlanService {
  constructor(
    @Inject(PLAN_REPO) private readonly planRepo: PlanRepo,
    @Inject(FEMALE_REPO) private readonly femaleRepo: FemaleRepo,
    @Inject(CLASSIFICATION_REPO) private readonly classificationRepo: ClassificationRepo,
    @Inject(BULL_REPO) private readonly bullRepo: BullRepo,
    @Inject(FARM_REPO) private readonly farmRepo: FarmRepo,
  ) {}

  getPlan(farmId: string): Promise<BreedingPlan> {
    return this.planRepo.getOrCreate(farmId);
  }

  /** REQ-D-12: una hembra, un toro — reemplaza si ya tenía uno elegido. */
  async addItem(farmId: string, item: PlanItem): Promise<BreedingPlan> {
    const plan = await this.planRepo.getOrCreate(farmId);
    const items = [...plan.items.filter((i) => i.femaleId !== item.femaleId), item];
    return this.planRepo.save({ ...plan, items, totals: totalsFor(items) });
  }

  async removeItem(farmId: string, femaleId: string): Promise<BreedingPlan> {
    const plan = await this.planRepo.getOrCreate(farmId);
    const items = plan.items.filter((i) => i.femaleId !== femaleId);
    return this.planRepo.save({ ...plan, items, totals: totalsFor(items) });
  }

  /** REQ-D-10: reemplaza todos los ítems por el mejor toro para cada hembra
   * no CULL_ALERT (Q5: "Plan automático" pisa lo elegido a mano). */
  async autoFill(farmId: string, goal: BreedingGoal): Promise<BreedingPlan> {
    const [farm, females, classificationRecord, bulls] = await Promise.all([
      this.farmRepo.findById(farmId),
      this.femaleRepo.listByFarm(farmId),
      this.classificationRepo.listByFarm(farmId),
      this.bullRepo.list(),
    ]);
    if (!farm || !classificationRecord || classificationRecord.items.length === 0) {
      throw new DomainError(
        'HERD_NOT_CLASSIFIED',
        'Clasificá el rodeo antes de armar el plan automático',
        409,
        { farmId },
      );
    }

    const profiles: GenomicProfile[] = females
      .map((f) => f.profile)
      .filter((p): p is GenomicProfile => p !== null);
    const stats = computeTraitStats(profiles);

    const built = buildAutoPlan(farm, females, classificationRecord.items, bulls, goal, stats);
    const plan = await this.planRepo.getOrCreate(farmId);
    return this.planRepo.save({ ...plan, items: built.items, totals: built.totals });
  }
}

/**
 * REQ-D-11: `doses`/`cost` se recalculan siempre, con lo único que un
 * `PlanItem` trae (nunca inventa un precio null como 0). `avgExpectedProgeny`
 * queda vacío tras un alta/baja manual: recomputarlo pediría el `goal` con el
 * que se eligió cada toro, que no viaja en `PlanItem` — "Plan automático" sí
 * lo calcula de punta a punta porque corre con un único `goal` para todos.
 */
function totalsFor(items: PlanItem[]): BreedingPlan['totals'] {
  const doses = { ...EMPTY_DOSES };
  let cost = 0;
  for (const item of items) {
    doses[item.semenType] += 1;
    if (item.pricePerDose !== null) cost += item.pricePerDose;
  }
  return { doses, cost, avgExpectedProgeny: {} };
}
