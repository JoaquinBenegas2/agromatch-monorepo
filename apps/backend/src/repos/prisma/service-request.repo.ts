import { Injectable } from '@nestjs/common';
import type { ServiceRequest, ServiceRequestStatus } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ServiceRequestRepo } from '../service-request.port.js';

interface ServiceRequestRow {
  id: string;
  needId: string;
  providerId: string;
  message: string;
  status: string;
  createdAt: Date;
  contactPhone: string | null;
  contactEmail: string | null;
}

function toDomain(row: ServiceRequestRow): ServiceRequest {
  return {
    id: row.id,
    needId: row.needId,
    providerId: row.providerId,
    message: row.message,
    status: row.status as ServiceRequestStatus,
    createdAt: row.createdAt.toISOString(),
    contact: { phone: row.contactPhone ?? undefined, email: row.contactEmail ?? undefined },
  };
}

@Injectable()
export class PrismaServiceRequestRepo implements ServiceRequestRepo {
  constructor(private readonly prisma: PrismaService) {}

  async create(r: ServiceRequest): Promise<ServiceRequest> {
    const row = await this.prisma.serviceRequest.create({
      data: {
        id: r.id,
        needId: r.needId,
        providerId: r.providerId,
        message: r.message,
        status: r.status,
        createdAt: new Date(r.createdAt),
        contactPhone: r.contact.phone ?? null,
        contactEmail: r.contact.email ?? null,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<ServiceRequest | null> {
    const row = await this.prisma.serviceRequest.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
