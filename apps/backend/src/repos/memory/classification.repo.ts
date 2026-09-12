import { Injectable } from '@nestjs/common';
import type { BreedingGoal, Classification } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { ClassificationRepo } from '../classification.port.js';

@Injectable()
export class InMemoryClassificationRepo implements ClassificationRepo {
  constructor(private readonly store: MemoryStore) {}

  /**
   * Reemplazo total por tambo (equivalente a `deleteMany` + `createMany` de
   * `PrismaClassificationRepo`): `listByFarm` siempre responde con la
   * ÚLTIMA clasificación corrida (el chat depende de esto, `chat.service.ts`).
   */
  async replaceForFarm(farmId: string, goal: BreedingGoal, items: Classification[]): Promise<void> {
    this.store.classifications.set(farmId, {
      goal: structuredClone(goal),
      items: items.map((item) => structuredClone(item)),
    });
  }

  async listByFarm(
    farmId: string,
  ): Promise<{ goal: BreedingGoal; items: Classification[] } | null> {
    const stored = this.store.classifications.get(farmId);
    if (!stored) return null;
    return { goal: structuredClone(stored.goal), items: stored.items.map((item) => structuredClone(item)) };
  }
}
