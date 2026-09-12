import { http, HttpResponse } from 'msw';
import { needsSamples, providers } from '@org/shared-types/fixtures';

/** Feature `mvp-b-need` (mercado). Sirve `needs.samples.json` y `providers.json`. */
export const needsHandlers = [
  http.get('/api/needs', ({ request }) => {
    const url = new URL(request.url);
    const farmId = url.searchParams.get('farmId');
    const needs = needsSamples
      .map((s) => s.need)
      .filter((n) => !farmId || n.farmId === farmId);
    return HttpResponse.json(needs);
  }),

  http.get('/api/providers', () => {
    // RN-36: `contact` no sale por GET /providers.
    return HttpResponse.json(providers.map(({ contact: _contact, ...rest }) => rest));
  }),
];
