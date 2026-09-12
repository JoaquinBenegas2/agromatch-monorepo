import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { BreedingPlan, PlanItem, SemenType, TraitVector } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PlanRepo } from '../plan.port.js';

interface PlanRow {
  id: string;
  farmId: string;
  createdAt: Date;
  doses: unknown;
  cost: number;
  avgExpectedProgeny: unknown;
  items: Array<{
    femaleId: string;
    bullNaab: string;
    semenType: string;
    compatibility: number;
    pricePerDose: number | null;
  }>;
}

function toDomain(row: PlanRow): BreedingPlan {
  return {
    id: row.id,
    farmId: row.farmId,
    createdAt: row.createdAt.toISOString(),
    items: row.items.map(
      (i): PlanItem => ({
        femaleId: i.femaleId,
        bullNaab: i.bullNaab,
        semenType: i.semenType as SemenType,
        compatibility: i.compatibility,
        pricePerDose: i.pricePerDose,
      }),
    ),
    totals: {
      doses: row.doses as Record<SemenType, number>,
      cost: row.cost,
      avgExpectedProgeny: row.avgExpectedProgeny as Partial<TraitVector>,
    },
  };
}

const EMPTY_DOSES: Record<SemenType, number> = { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 };

@Injectable()
export class PrismaPlanRepo implements PlanRepo {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(farmId: string): Promise<BreedingPlan> {
    const existing = await this.prisma.breedingPlan.findUnique({
      where: { farmId },
      include: { items: true },
    });
    if (existing) return toDomain(existing);

    const created = await this.prisma.breedingPlan.create({
      data: {
        id: randomUUID(),
        farmId,
        createdAt: new Date(),
        doses: EMPTY_DOSES,
        cost: 0,
        avgExpectedProgeny: {},
      },
      include: { items: true },
    });
    return toDomain(created);
  }

  async save(plan: BreedingPlan): Promise<BreedingPlan> {
    await this.prisma.$transaction([
      this.prisma.planItem.deleteMany({ where: { planId: plan.id } }),
      this.prisma.breedingPlan.update({
        where: { id: plan.id },
        data: {
          doses: plan.totals.doses,
          cost: plan.totals.cost,
          avgExpectedProgeny: plan.totals.avgExpectedProgeny,
          items: {
            create: plan.items.map((item) => ({
              femaleId: item.femaleId,
              bullNaab: item.bullNaab,
              semenType: item.semenType,
              compatibility: item.compatibility,
              pricePerDose: item.pricePerDose,
            })),
          },
        },
      }),
    ]);

    const updated = await this.prisma.breedingPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { items: true },
    });
    return toDomain(updated);
  }
}
