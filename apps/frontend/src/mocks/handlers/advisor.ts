import { http, HttpResponse } from 'msw';
import { samples } from '@org/shared-types/fixtures';

/** Feature `mvp-b-need` (anexo: panel del asesor). */
export const advisorHandlers = [
  http.get('/api/advisor/overview', () => HttpResponse.json(samples.farmSummaries)),
];
