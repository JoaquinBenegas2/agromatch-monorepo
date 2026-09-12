import { Injectable } from '@nestjs/common';
import {
  NegotiationMessageSchema,
  type ServiceRequestStatus,
} from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { serviceRequestToDomain } from './service-request.repo.js';
import type {
  NegotiationRepo,
  NegotiationRecord,
} from '../negotiation.port.js';
const include = { messages: { orderBy: { createdAt: 'asc' as const } } };
type Row = Prisma.ServiceRequestGetPayload<{ include: typeof include }>;
const toDomain = (row: Row): NegotiationRecord => ({
  ...serviceRequestToDomain(row),
  messages: row.messages.map((m) =>
    NegotiationMessageSchema.parse({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }),
  ),
});
@Injectable()
export class PrismaNegotiationRepo implements NegotiationRepo {
  constructor(private readonly prisma: PrismaService) {}
  async list(filter: { providerId?: string; needIds?: string[] }) {
    return (
      await this.prisma.serviceRequest.findMany({
        where: {
          ...(filter.providerId ? { providerId: filter.providerId } : {}),
          ...(filter.needIds ? { needId: { in: filter.needIds } } : {}),
        },
        include,
        orderBy: { updatedAt: 'desc' },
      })
    ).map(toDomain);
  }
  async findById(id: string) {
    const row = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include,
    });
    return row ? toDomain(row) : null;
  }
  async append(
    id: string,
    message: Parameters<NegotiationRepo['append']>[1],
    status: ServiceRequestStatus,
  ) {
    await this.prisma.$transaction([
      this.prisma.negotiationMessage.create({
        data: { serviceRequestId: id, ...message },
      }),
      this.prisma.serviceRequest.update({ where: { id }, data: { status } }),
    ]);
  }
}
