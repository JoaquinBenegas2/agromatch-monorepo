import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateReviewBody,
  CreateServiceRequestBody,
  Review,
  ServiceRequest,
  User,
} from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';
import { NEED_REPO, type NeedRepo } from '../../repos/need.port.js';
import { PROVIDER_REPO, type ProviderRepo } from '../../repos/provider.port.js';
import { REVIEW_REPO, type ReviewRepo } from '../../repos/review.port.js';
import {
  SERVICE_REQUEST_REPO,
  type ServiceRequestRepo,
} from '../../repos/service-request.port.js';
import { assertNeedAccess } from '../needs/need-access.js';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(SERVICE_REQUEST_REPO) private readonly requests: ServiceRequestRepo,
    @Inject(REVIEW_REPO) private readonly reviews: ReviewRepo,
    @Inject(NEED_REPO) private readonly needs: NeedRepo,
    @Inject(PROVIDER_REPO) private readonly providers: ProviderRepo,
  ) {}

  async create(
    needId: string,
    body: CreateServiceRequestBody,
    user: User,
  ): Promise<ServiceRequest> {
    const need = await this.needs.findById(needId);
    if (!need) {
      throw new DomainError('NEED_NOT_FOUND', 'La necesidad no existe', 404, {
        needId,
      });
    }
    assertNeedAccess(user, need);
    if (need.status === 'DRAFT') {
      throw new DomainError(
        'NEED_NOT_CONFIRMED',
        'Confirmá la necesidad antes de contactar proveedores',
        409,
        { needId },
      );
    }

    const provider = await this.providers.findById(body.providerId);
    if (!provider) {
      throw new DomainError(
        'PROVIDER_NOT_FOUND',
        'El proveedor no existe',
        404,
        {
          providerId: body.providerId,
        },
      );
    }
    return this.requests.create(
      {
        id: randomUUID(),
        needId,
        providerId: provider.id,
        message: body.message,
        status: 'SENT',
        createdAt: new Date().toISOString(),
        createdByUserId: user.id,
        contact: provider.contact,
      },
      user.name,
    );
  }

  async review(
    requestId: string,
    body: CreateReviewBody,
    user: User,
  ): Promise<Review> {
    const request = await this.requests.findById(requestId);
    if (!request) {
      throw new DomainError(
        'REQUEST_NOT_FOUND',
        'La solicitud no existe',
        404,
        { requestId },
      );
    }
    const need = await this.needs.findById(request.needId);
    if (!need) {
      throw new DomainError('NEED_NOT_FOUND', 'La necesidad no existe', 404, {
        needId: request.needId,
      });
    }
    assertNeedAccess(user, need);

    const provider = await this.providers.findById(request.providerId);
    if (!provider) {
      throw new DomainError(
        'PROVIDER_NOT_FOUND',
        'El proveedor no existe',
        404,
        {
          providerId: request.providerId,
        },
      );
    }
    const review = await this.reviews.create({
      id: randomUUID(),
      serviceRequestId: request.id,
      providerId: provider.id,
      rating: body.rating,
      comment: body.comment,
      createdAt: new Date().toISOString(),
    });
    const jobs = provider.reputation.jobs + 1;
    const previousTotal =
      (provider.reputation.avg ?? 0) * provider.reputation.jobs;
    await this.providers.updateReputation(provider.id, {
      avg: (previousTotal + body.rating) / jobs,
      jobs,
    });
    return review;
  }
}
