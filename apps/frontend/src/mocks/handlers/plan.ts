import { http, HttpResponse } from 'msw';
import { samples } from '@org/shared-types/fixtures';

/** Feature `mvp-d-match` (plan de servicios). */
export const planHandlers = [
  http.get('/api/farms/:farmId/plan', () => HttpResponse.json(samples.breedingPlan)),
  http.post('/api/farms/:farmId/plan/items', () => HttpResponse.json(samples.breedingPlan)),
  http.delete('/api/farms/:farmId/plan/items/:femaleId', () => HttpResponse.json(samples.breedingPlan)),
  http.post('/api/farms/:farmId/plan/auto', () => HttpResponse.json(samples.breedingPlan)),
];
