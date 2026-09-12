import { Injectable } from '@nestjs/common';
import type { Breed, Bull, GenomicProfile, SemenType } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { BullRepo } from '../bull.port.js';

interface BullRow {
  naab: string;
  name: string;
  company: string;
  breed: string;
  profile: unknown;
  sireNaab: string | null;
  calvingEase: number | null;
  semenTypes: string[];
  pricePerDose: number | null;
  source: string;
}

function toDomain(row: BullRow): Bull {
  return {
    naab: row.naab,
    name: row.name,
    company: row.company,
    breed: row.breed as Breed,
    profile: (row.profile as GenomicProfile | null) ?? null,
    sireNaab: row.sireNaab,
    calvingEase: row.calvingEase,
    semenTypes: row.semenTypes as SemenType[],
    pricePerDose: row.pricePerDose,
    source: row.source,
  };
}

@Injectable()
export class PrismaBullRepo implements BullRepo {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Bull[]> {
    const rows = await this.prisma.bull.findMany();
    return rows.map(toDomain);
  }

  async findByNaab(naab: string): Promise<Bull | null> {
    const row = await this.prisma.bull.findUnique({ where: { naab } });
    return row ? toDomain(row) : null;
  }

  async upsertMany(bulls: Bull[]): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;
    for (const b of bulls) {
      const existing = await this.prisma.bull.findUnique({ where: { naab: b.naab } });
      await this.prisma.bull.upsert({
        where: { naab: b.naab },
        create: {
          naab: b.naab,
          name: b.name,
          company: b.company,
          breed: b.breed,
          profile: b.profile ?? undefined,
          sireNaab: b.sireNaab,
          calvingEase: b.calvingEase,
          semenTypes: b.semenTypes,
          pricePerDose: b.pricePerDose,
          source: b.source,
        },
        update: {
          name: b.name,
          company: b.company,
          breed: b.breed,
          profile: b.profile ?? undefined,
          sireNaab: b.sireNaab,
          calvingEase: b.calvingEase,
          semenTypes: b.semenTypes,
          pricePerDose: b.pricePerDose,
          source: b.source,
        },
      });
      if (existing) updated += 1;
      else added += 1;
    }
    return { added, updated };
  }
}
