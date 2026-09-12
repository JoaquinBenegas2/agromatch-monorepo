import { useQuery } from '@tanstack/react-query';
import { BreedingPlanSchema } from '@org/shared-types';
import { api } from '../client.js';
import { queryKeys } from '../keys.js';

/** REQ-D-10: el plan de servicios del tambo activo. */
export function usePlan(farmId: string | null) {
  return useQuery({
    queryKey: queryKeys.plan(farmId ?? ''),
    queryFn: () => api.get(`/farms/${farmId}/plan`, BreedingPlanSchema),
    enabled: !!farmId,
  });
}
