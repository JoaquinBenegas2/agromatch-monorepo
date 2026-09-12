import { Injectable } from '@nestjs/common';
import type { Review } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { ReviewRepo } from '../review.port.js';

@Injectable()
export class InMemoryReviewRepo implements ReviewRepo {
  constructor(private readonly store: MemoryStore) {}

  async create(r: Review): Promise<Review> {
    const stored = structuredClone(r);
    this.store.reviews.set(stored.id, stored);
    return structuredClone(stored);
  }
}
