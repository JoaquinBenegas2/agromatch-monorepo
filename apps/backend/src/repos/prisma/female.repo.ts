import { Injectable } from '@nestjs/common';
import type { Female, FemaleCategory, GenomicProfile } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { FemaleRepo } from '../female.port.js';

interface FemaleRow {
  id: string;
  farmId: string;
  visualId: string;
  birthDate: string;
  sireNaab: string | null;
  category: string;
  profile: unknown;
}

function toDomain(row: FemaleRow): Female {
  return {
    id: row.id,
    farmId: row.farmId,
    visualId: row.visualId,
    birthDate: row.birthDate,
    sireNaab: row.sireNaab,
    category: row.category as FemaleCategory,
    profile: (row.profile as GenomicProfile | null) ?? null,
  };
}

@Injectable()
export class PrismaFemaleRepo implements FemaleRepo {
  constructor(private readonly prisma: PrismaService) {}

  async listByFarm(farmId: string): Promise<Female[]> {
    const rows = await this.prisma.female.findMany({ where: { farmId } });
    return rows.map(toDomain);
  }

  async findById(farmId: string, id: string): Promise<Female | null> {
    const row = await this.prisma.female.findFirst({ where: { farmId, id } });
    return row ? toDomain(row) : null;
  }

  async upsertMany(farmId: string, females: Female[]): Promise<number> {
    const visualIds = females.map((female) => female.visualId);
    await this.prisma.female.deleteMany({ where: { farmId, visualId: { notIn: visualIds } } });
    let count = 0;
    for (const f of females) {
      await this.prisma.female.upsert({
        where: { farmId_visualId: { farmId, visualId: f.visualId } },
        create: {
          id: f.id,
          farmId,
          visualId: f.visualId,
          birthDate: f.birthDate,
          sireNaab: f.sireNaab,
          category: f.category,
          profile: f.profile ?? undefined,
        },
        update: {
          birthDate: f.birthDate,
          sireNaab: f.sireNaab,
          category: f.category,
          profile: f.profile ?? undefined,
        },
      });
      count += 1;
    }
    return count;
  }
}
