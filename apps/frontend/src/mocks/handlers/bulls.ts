import { http, HttpResponse } from 'msw';
import { bullsSeed } from '@org/shared-types/fixtures';

export const bullsHandlers = [
  http.get('/api/bulls', () => HttpResponse.json(bullsSeed)),
];
