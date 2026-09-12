import { Injectable } from '@nestjs/common';
import type { Farm } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { FarmRepo } from '../farm.port.js';

interface FarmRow {
  id: string;
  name: string;
  location: string;
  sexedPct: number;
  beefPct: number;
  calvingEaseMaxHeifer: number;
  scsGrayZoneFrom: number;
  scsGrayZoneTo: number;
  plGrayZoneFrom: number;
  plGrayZoneTo: number;
}

function toDomain(row: FarmRow): Farm {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    tierQuotas: { sexedPct: row.sexedPct, beefPct: row.beefPct },
    calvingEaseMaxHeifer: row.calvingEaseMaxHeifer,
    scsGrayZone: { from: row.scsGrayZoneFrom, to: row.scsGrayZoneTo },
    plGrayZone: { from: row.plGrayZoneFrom, to: row.plGrayZoneTo },
  };
}

export function farmToPrismaData(farm: Farm): FarmRow {
  return {
    id: farm.id,
    name: farm.name,
    location: farm.location,
    sexedPct: farm.tierQuotas.sexedPct,
    beefPct: farm.tierQuotas.beefPct,
    calvingEaseMaxHeifer: farm.calvingEaseMaxHeifer,
    scsGrayZoneFrom: farm.scsGrayZone.from,
    scsGrayZoneTo: farm.scsGrayZone.to,
    plGrayZoneFrom: farm.plGrayZone.from,
    plGrayZoneTo: farm.plGrayZone.to,
  };
}

@Injectable()
export class PrismaFarmRepo implements FarmRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findByIds(ids: string[]): Promise<Farm[]> {
    const rows = await this.prisma.farm.findMany({ where: { id: { in: ids } } });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Farm | null> {
    const row = await this.prisma.farm.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
