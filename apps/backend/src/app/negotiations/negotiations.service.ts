import { Inject, Injectable } from '@nestjs/common';
import type {
  Negotiation,
  SendNegotiationMessageBody,
  User,
} from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';
import {
  NEGOTIATION_REPO,
  type NegotiationRepo,
  type NegotiationRecord,
} from '../../repos/negotiation.port.js';
import { NEED_REPO, type NeedRepo } from '../../repos/need.port.js';
import { PROVIDER_REPO, type ProviderRepo } from '../../repos/provider.port.js';
import { FARM_REPO, type FarmRepo } from '../../repos/farm.port.js';

/** Same final negotiation workflow for both persistence profiles. */
@Injectable()
export class NegotiationsService {
  constructor(
    @Inject(NEGOTIATION_REPO) private readonly negotiations: NegotiationRepo,
    @Inject(NEED_REPO) private readonly needs: NeedRepo,
    @Inject(PROVIDER_REPO) private readonly providers: ProviderRepo,
    @Inject(FARM_REPO) private readonly farms: FarmRepo,
  ) {}
  async list(user: User): Promise<Negotiation[]> {
    let filter: { providerId?: string; needIds?: string[] };
    if (user.role === 'PROVIDER') {
      if (!user.providerId)
        throw new DomainError(
          'PROVIDER_ACCOUNT_INCOMPLETE',
          'La cuenta no está vinculada a un proveedor',
          403,
        );
      filter = { providerId: user.providerId };
    } else {
      const needs = (
        await Promise.all(
          user.farmIds.map((id) =>
            this.needs.listByFarm(id, { includeSynthetic: true }),
          ),
        )
      ).flat();
      filter = { needIds: needs.map((n) => n.id) };
    }
    return Promise.all(
      (await this.negotiations.list(filter)).map((request) =>
        this.toDomain(request),
      ),
    );
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
    if (request.status === 'DONE' || request.status === 'CANCELLED')
      throw new DomainError(
        'NEGOTIATION_CLOSED',
        'Esta negociación ya está cerrada',
        409,
      );
    const fromProvider = user.role === 'PROVIDER';
    await this.negotiations.append(
      id,
      {
        senderUserId: user.id,
        senderName: user.name,
        senderType: fromProvider ? 'PROVIDER' : 'CUSTOMER',
        body: body.body,
      },
      fromProvider && request.status === 'SENT' ? 'ANSWERED' : request.status,
    );
    return this.get(id, user);
  }
  private async authorizedRequest(
    id: string,
    user: User,
  ): Promise<NegotiationRecord> {
    const request = await this.negotiations.findById(id);
    if (!request)
      throw new DomainError(
        'NEGOTIATION_NOT_FOUND',
        'La negociación no existe',
        404,
        { id },
      );
    if (user.role === 'PROVIDER') {
      if (!user.providerId || request.providerId !== user.providerId)
        throw new DomainError(
          'NEGOTIATION_FORBIDDEN',
          'No tenés acceso a esta negociación',
          403,
        );
      return request;
    }
    const need = await this.needs.findById(request.needId);
    if (!need || !user.farmIds.includes(need.farmId))
      throw new DomainError(
        'NEGOTIATION_FORBIDDEN',
        'No tenés acceso a esta negociación',
        403,
      );
    return request;
  }
  private async toDomain(request: NegotiationRecord): Promise<Negotiation> {
    const [need, provider] = await Promise.all([
      this.needs.findById(request.needId),
      this.providers.findById(request.providerId),
    ]);
    if (!need || !provider)
      throw new DomainError(
        'NEGOTIATION_DATA_INCOMPLETE',
        'Faltan datos de la negociación',
        409,
      );
    const farm = await this.farms.findById(need.farmId);
    if (!farm)
      throw new DomainError(
        'FARM_NOT_FOUND',
        'El establecimiento no existe',
        404,
      );
    return {
      id: request.id,
      needId: request.needId,
      providerId: provider.id,
      providerName: provider.name,
      providerImageUrl: provider.imageUrl,
      farmId: farm.id,
      farmName: farm.name,
      subject: need.what,
      category: need.category,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt ?? request.createdAt,
      messages: request.messages,
    };
  }
}
