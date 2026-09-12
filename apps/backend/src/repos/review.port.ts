import type { Review } from '@org/shared-types';

export interface ReviewRepo {
  create(r: Review): Promise<Review>;
}

export const REVIEW_REPO = Symbol('REVIEW_REPO');
