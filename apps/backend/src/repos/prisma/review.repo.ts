import { Injectable } from '@nestjs/common';
import type { Review } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ReviewRepo } from '../review.port.js';

@Injectable()
export class PrismaReviewRepo implements ReviewRepo {
  constructor(private readonly prisma: PrismaService) {}

  async create(r: Review): Promise<Review> {
    const row = await this.prisma.review.create({
      data: {
        id: r.id,
        serviceRequestId: r.serviceRequestId,
        providerId: r.providerId,
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(r.createdAt),
      },
    });
    return {
      id: row.id,
      serviceRequestId: row.serviceRequestId,
      providerId: row.providerId,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
