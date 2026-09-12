import { Injectable } from '@nestjs/common';
import type {
  NeedCategory,
  Negotiation,
  SendNegotiationMessageBody,
  User,
} from '@org/shared-types';
import type { Prisma } from '../../generated/prisma/client.js';
import { DomainError } from '../../common/errors/domain-error.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type RequestWithMessages = Prisma.ServiceRequestGetPayload<{
  include: { messages: { orderBy: { createdAt: 'asc' } } };
}>;

@Injectable()
export class NegotiationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: User): Promise<Negotiation[]> {
    const where = await this.visibleWhere(user);
    const requests = await this.prisma.serviceRequest.findMany({
      where,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(requests.map((request) => this.toDomain(request)));
  }

  async get(id: string, user: User): Promise<Negotiation> {
    return this.toDomain(await this.authorizedRequest(id, user));
  }

  async sendMessage(
    id: string,
    body: SendNegotiationMessageBody,
    user: User,
  ): Promise<Negotiation> {
    const request = await this.authorizedRequest(id, user);
    this.assertOpen(request.status);
    const fromProvider = user.role === 'PROVIDER';

    await this.prisma.$transaction([
      this.prisma.negotiationMessage.create({
        data: {
          serviceRequestId: id,
          senderUserId: user.id,
          senderName: user.name,
          senderType: fromProvider ? 'PROVIDER' : 'CUSTOMER',
          body: body.body,
        },
      }),
      this.prisma.serviceRequest.update({
        where: { id },
        data: { status: fromProvider && request.status === 'SENT' ? 'ANSWERED' : request.status },
      }),
    ]);
    return this.get(id, user);
  }

  private async visibleWhere(user: User): Promise<Prisma.ServiceRequestWhereInput> {
    if (user.role === 'PROVIDER') {
      if (!user.providerId) {
        throw new DomainError('PROVIDER_ACCOUNT_INCOMPLETE', 'La cuenta no está vinculada a un proveedor', 403);
      }
      return { providerId: user.providerId };
    }
    const needs = await this.prisma.need.findMany({
      where: { farmId: { in: user.farmIds } },
      select: { id: true },
    });
    return { needId: { in: needs.map((need) => need.id) } };
  }

  private async authorizedRequest(id: string, user: User): Promise<RequestWithMessages> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!request) {
      throw new DomainError('NEGOTIATION_NOT_FOUND', 'La negociación no existe', 404, { id });
    }
    if (user.role === 'PROVIDER') {
      if (!user.providerId || request.providerId !== user.providerId) {
        throw new DomainError('NEGOTIATION_FORBIDDEN', 'No tenés acceso a esta negociación', 403);
      }
      return request;
    }
    const need = await this.prisma.need.findUnique({ where: { id: request.needId } });
    if (!need || !user.farmIds.includes(need.farmId)) {
      throw new DomainError('NEGOTIATION_FORBIDDEN', 'No tenés acceso a esta negociación', 403);
    }
    return request;
  }

  private assertOpen(status: string): void {
    if (status === 'DONE' || status === 'CANCELLED') {
      throw new DomainError('NEGOTIATION_CLOSED', 'Esta negociación ya está cerrada', 409);
    }
  }

  private async toDomain(request: RequestWithMessages): Promise<Negotiation> {
    const need = await this.prisma.need.findUnique({ where: { id: request.needId } });
    const provider = await this.prisma.provider.findUnique({ where: { id: request.providerId } });
    if (!need || !provider) {
      throw new DomainError('NEGOTIATION_DATA_INCOMPLETE', 'Faltan datos de la negociación', 409);
    }
    const farm = await this.prisma.farm.findUnique({ where: { id: need.farmId } });
    if (!farm) {
      throw new DomainError('FARM_NOT_FOUND', 'El establecimiento no existe', 404);
    }

    return {
      id: request.id,
      needId: request.needId,
      providerId: request.providerId,
      providerName: provider.name,
      providerImageUrl: provider.imageUrl ?? undefined,
      farmId: farm.id,
      farmName: farm.name,
      subject: need.what,
      category: need.category as NeedCategory,
      status: request.status as Negotiation['status'],
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      messages: request.messages.map((message) => ({
        id: message.id,
        serviceRequestId: message.serviceRequestId,
        senderUserId: message.senderUserId,
        senderName: message.senderName,
        senderType: message.senderType as 'CUSTOMER' | 'PROVIDER',
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    };
  }
}
