import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { FarmSummarySchema } from '@org/shared-types';
import { api } from '../../shared/api/client.js';
import { queryKeys } from '../../shared/api/keys.js';

const FarmSummaryListSchema = z.array(FarmSummarySchema);

/** REQ-B-ADV-01: `GET /advisor/overview`, un `FarmSummary` por tambo del asesor. */
export function useAdvisorOverview() {
  return useQuery({
    queryKey: queryKeys.advisorOverview(),
    queryFn: () => api.get('/advisor/overview', FarmSummaryListSchema),
  });
}
