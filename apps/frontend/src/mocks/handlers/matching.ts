import { http, HttpResponse } from 'msw';
import { samples } from '@org/shared-types/fixtures';

/** Feature `mvp-d-match` (swipe, explicación, objetivo). */
export const matchingHandlers = [
  http.post('/api/farms/:farmId/females/:femaleId/matches', () =>
    HttpResponse.json(samples.matchBoardGenetics),
  ),

  http.post('/api/farms/:farmId/females/:femaleId/matches/:naab/explanation', () =>
    HttpResponse.json(samples.explanation),
  ),

  http.post('/api/goals/parse', () => HttpResponse.json(samples.explanationFacts.goal)),
];
