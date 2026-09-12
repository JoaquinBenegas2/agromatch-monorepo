import type { Review } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import { InMemoryReviewRepo } from './review.repo.js';

describe('InMemoryReviewRepo', () => {
  it('create guarda la valoración y la devuelve', async () => {
    const repo = new InMemoryReviewRepo(new MemoryStore());
    const review: Review = {
      id: 'rev-1',
      serviceRequestId: 'req-1',
      providerId: 'provider-1',
      rating: 4,
      comment: 'buen trabajo',
      createdAt: new Date().toISOString(),
    };

    const created = await repo.create(review);

    expect(created).toEqual(review);
  });
});
