import { http, HttpResponse } from 'msw';
import { herdFarmA, samples } from '@org/shared-types/fixtures';

/** Feature `mvp-c-herd` (rodeo, importación, clasificación). */
export const herdHandlers = [
  http.post('/api/farms/:farmId/herd-imports', () =>
    HttpResponse.json({ importId: 'import-demo-1', proposal: samples.mappingProposal }),
  ),

  http.post('/api/farms/:farmId/herd-imports/:importId/confirm', () =>
    HttpResponse.json(samples.herdImportResult),
  ),

  http.get('/api/farms/:farmId/females', () => {
    const classifiedByFemale = new Map(samples.classifications.map((c) => [c.femaleId, c]));
    const females = herdFarmA.females.map((f) => ({
      ...f,
      classification: classifiedByFemale.get(f.id) ?? null,
    }));
    return HttpResponse.json(females);
  }),

  http.post('/api/farms/:farmId/classifications', () => HttpResponse.json(samples.classifications)),

  http.get('/api/farms/:farmId/classifications/summary', () =>
    HttpResponse.json(samples.classificationSummary),
  ),
];
