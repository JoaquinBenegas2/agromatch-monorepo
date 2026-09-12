import { Injectable } from '@nestjs/common';
import type {
  Capability,
  GeoPoint,
  Magnitude,
  NeedCategory,
  PriceModel,
  Provider,
  ProviderType,
  TimeWindow,
} from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ProviderRepo } from '../provider.port.js';

interface ProviderRow {
  id: string;
  name: string;
  type: string;
  base: unknown;
  verified: boolean;
  reputationAvg: number | null;
  reputationJobs: number;
  contactPhone: string | null;
  contactEmail: string | null;
  source: string;
}

function providerToDomain(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ProviderType,
    base: row.base as GeoPoint,
    verified: row.verified,
    reputation: { avg: row.reputationAvg, jobs: row.reputationJobs },
    contact: {
      phone: row.contactPhone ?? undefined,
      email: row.contactEmail ?? undefined,
    },
    source: row.source,
  };
}

interface CapabilityRow {
  id: string;
  providerId: string;
  category: string;
  serviceType: string;
  coverageRadiusKm: number;
  capacityPerDay: unknown;
  availability: unknown;
  priceModel: string;
  priceFrom: number | null;
  certifications: string[];
  attributes: unknown;
}

function capabilityToDomain(row: CapabilityRow): Capability {
  return {
    id: row.id,
    providerId: row.providerId,
    category: row.category as NeedCategory,
    serviceType: row.serviceType,
    coverageRadiusKm: row.coverageRadiusKm,
    capacityPerDay: (row.capacityPerDay as Magnitude | null) ?? undefined,
    availability: row.availability as TimeWindow[],
    priceModel: row.priceModel as PriceModel,
    priceFrom: row.priceFrom ?? undefined,
    certifications: row.certifications,
    attributes: row.attributes as Record<string, string | number | boolean>,
  };
}

@Injectable()
export class PrismaProviderRepo implements ProviderRepo {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter?: { category?: NeedCategory }): Promise<Provider[]> {
    const providerIds = filter?.category
      ? new Set(
          (
            await this.prisma.capability.findMany({
              where: { category: filter.category },
              select: { providerId: true },
            })
          ).map((c) => c.providerId),
        )
      : null;

    const rows = await this.prisma.provider.findMany(
      providerIds ? { where: { id: { in: [...providerIds] } } } : undefined,
    );
    return rows.map(providerToDomain);
  }

  async findById(id: string): Promise<Provider | null> {
    const row = await this.prisma.provider.findUnique({ where: { id } });
    return row ? providerToDomain(row) : null;
  }

  async listCapabilities(filter?: { category?: NeedCategory }): Promise<Capability[]> {
    const rows = await this.prisma.capability.findMany({
      where: filter?.category ? { category: filter.category } : undefined,
    });
    return rows.map(capabilityToDomain);
  }
}
