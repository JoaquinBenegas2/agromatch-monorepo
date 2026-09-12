import { Injectable } from '@nestjs/common';
import type { Female } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { FemaleRepo } from '../female.port.js';

@Injectable()
export class InMemoryFemaleRepo implements FemaleRepo {
  constructor(private readonly store: MemoryStore) {}

  async listByFarm(farmId: string): Promise<Female[]> {
    const result: Female[] = [];
    for (const female of this.store.females.values()) {
      if (female.farmId === farmId) result.push(structuredClone(female));
    }
    return result;
  }

  async findById(farmId: string, id: string): Promise<Female | null> {
    const female = this.store.females.get(id);
    return female && female.farmId === farmId ? structuredClone(female) : null;
  }

  /**
   * Misma semántica que `PrismaFemaleRepo` (REQ-AK-01): borra las hembras del
   * tambo que ya no vienen en `females` (por `visualId`), y hace upsert por
   * la clave única `(farmId, visualId)`. En un update, el `id` de la fila
   * existente se conserva — solo se pisan los campos mutables — igual que
   * Prisma, que nunca reescribe la primary key en un `update`.
   */
  async upsertMany(farmId: string, females: Female[]): Promise<number> {
    const incomingVisualIds = new Set(females.map((f) => f.visualId));
    for (const [id, existing] of this.store.females) {
      if (existing.farmId === farmId && !incomingVisualIds.has(existing.visualId)) {
        this.store.females.delete(id);
      }
    }

    let count = 0;
    for (const female of females) {
      const existing = this.findByFarmAndVisualId(farmId, female.visualId);
      if (existing) {
        this.store.females.set(existing.id, {
          ...existing,
          birthDate: female.birthDate,
          sireNaab: female.sireNaab,
          category: female.category,
          profile: female.profile ?? null,
        });
      } else {
        this.store.females.set(female.id, { ...structuredClone(female), farmId });
      }
      count += 1;
    }
    return count;
  }

  private findByFarmAndVisualId(farmId: string, visualId: string): Female | undefined {
    for (const female of this.store.females.values()) {
      if (female.farmId === farmId && female.visualId === visualId) return female;
    }
    return undefined;
  }
}
