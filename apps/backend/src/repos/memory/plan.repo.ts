import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { BreedingPlan, SemenType } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { PlanRepo } from '../plan.port.js';

const EMPTY_DOSES: Record<SemenType, number> = { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 };

@Injectable()
export class InMemoryPlanRepo implements PlanRepo {
  constructor(private readonly store: MemoryStore) {}

  async getOrCreate(farmId: string): Promise<BreedingPlan> {
    const existing = this.store.plans.get(farmId);
    if (existing) return structuredClone(existing);

    const created: BreedingPlan = {
      id: randomUUID(),
      farmId,
      createdAt: new Date().toISOString(),
      items: [],
      totals: { doses: { ...EMPTY_DOSES }, cost: 0, avgExpectedProgeny: {} },
    };
    this.store.plans.set(farmId, created);
    return structuredClone(created);
  }

  async save(plan: BreedingPlan): Promise<BreedingPlan> {
    this.store.plans.set(plan.farmId, structuredClone(plan));
    return structuredClone(plan);
  }
}
