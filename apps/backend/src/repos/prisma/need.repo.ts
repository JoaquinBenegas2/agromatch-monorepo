import { Injectable } from '@nestjs/common';
import type {
  BreedingGoal,
  GeoPoint,
  Magnitude,
  Need,
  NeedCategory,
  NeedStatus,
  TimeWindow,
} from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { NeedRepo } from '../need.port.js';

interface NeedRow {
  id: string;
  farmId: string;
  rawText: string;
  category: string;
  what: string;
  where: unknown | null;
  radiusKm: number | null;
  window: unknown | null;
  magnitude: unknown;
  constraints: string[];
  budget: number | null;
  status: string;
  goal: unknown;
  createdAt: Date;
  missingFields: string[];
  confidence: unknown;
  synthetic: boolean;
}

function toDomain(row: NeedRow): Need {
  return {
    id: row.id,
    farmId: row.farmId,
    rawText: row.rawText,
    category: row.category as NeedCategory,
    what: row.what,
    where: (row.where as GeoPoint | null) ?? undefined,
    radiusKm: row.radiusKm ?? undefined,
    window: (row.window as TimeWindow | null) ?? undefined,
    magnitude: (row.magnitude as Magnitude | null) ?? undefined,
    constraints: row.constraints,
    budget: row.budget ?? undefined,
    status: row.status as NeedStatus,
    goal: (row.goal as BreedingGoal | null) ?? undefined,
    createdAt: row.createdAt.toISOString(),
    missingFields: row.missingFields.length > 0 ? (row.missingFields as Need['missingFields']) : undefined,
    confidence: (row.confidence as Need['confidence']) ?? undefined,
    synthetic: row.synthetic || undefined,
  };
}

function toRow(n: Need) {
  return {
    id: n.id,
    farmId: n.farmId,
    rawText: n.rawText,
    category: n.category,
    what: n.what,
    where: n.where ?? undefined,
    radiusKm: n.radiusKm ?? null,
    window: n.window ?? undefined,
    magnitude: n.magnitude ?? undefined,
    constraints: n.constraints,
    budget: n.budget ?? null,
    status: n.status,
    goal: n.goal ?? undefined,
    createdAt: new Date(n.createdAt),
    missingFields: n.missingFields ?? [],
    confidence: n.confidence ?? undefined,
    synthetic: n.synthetic ?? false,
  };
}

@Injectable()
export class PrismaNeedRepo implements NeedRepo {
  constructor(private readonly prisma: PrismaService) {}

  async create(n: Need): Promise<Need> {
    const row = await this.prisma.need.create({ data: toRow(n) });
    return toDomain(row);
  }

  async update(n: Need): Promise<Need> {
    const row = await this.prisma.need.update({ where: { id: n.id }, data: toRow(n) });
    return toDomain(row);
  }

  async findById(id: string): Promise<Need | null> {
    const row = await this.prisma.need.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async listByFarm(farmId: string, opts?: { includeSynthetic?: boolean }): Promise<Need[]> {
    const rows = await this.prisma.need.findMany({
      where: { farmId, ...(opts?.includeSynthetic ? {} : { synthetic: false }) },
    });
    return rows.map(toDomain);
  }
}
