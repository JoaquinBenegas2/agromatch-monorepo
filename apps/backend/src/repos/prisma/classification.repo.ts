import { Injectable } from '@nestjs/common';
import type {
  BreedingGoal,
  Classification,
  Tag,
  TraitKey,
  SemenType,
  Tier,
} from '@org/shared-types';
import { hashGoal } from '../../common/goal-hash.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ClassificationRepo } from '../classification.port.js';

interface ClassificationRow {
  femaleId: string;
  goal: unknown;
  tier: string;
  semenType: string | null;
  ciPercentile: number;
  tags: string[];
  corrective: string[];
  reasons: string[];
}

function toDomain(row: ClassificationRow): Classification {
  return {
    femaleId: row.femaleId,
    tier: row.tier as Tier,
    semenType: row.semenType as SemenType | null,
    ciPercentile: row.ciPercentile,
    tags: row.tags as Tag[],
    corrective: row.corrective as TraitKey[],
    reasons: row.reasons,
  };
}

@Injectable()
export class PrismaClassificationRepo implements ClassificationRepo {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForFarm(
    farmId: string,
    goal: BreedingGoal,
    items: Classification[],
  ): Promise<void> {
    const goalHash = hashGoal(goal);
    await this.prisma.$transaction([
      this.prisma.classification.deleteMany({ where: { farmId } }),
      this.prisma.classification.createMany({
        data: items.map((c) => ({
          farmId,
          femaleId: c.femaleId,
          goalHash,
          goal: goal as object,
          tier: c.tier,
          semenType: c.semenType,
          ciPercentile: c.ciPercentile,
          tags: c.tags,
          corrective: c.corrective,
          reasons: c.reasons,
        })),
      }),
    ]);
  }

  async listByFarm(
    farmId: string,
  ): Promise<{ goal: BreedingGoal; items: Classification[] } | null> {
    const rows = await this.prisma.classification.findMany({
      where: { farmId },
    });
    if (rows.length === 0) return null;
    return { goal: rows[0].goal as BreedingGoal, items: rows.map(toDomain) };
  }
}
