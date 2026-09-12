import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { BreedingGoal } from '@org/shared-types';
import { ExplanationSchema } from '@org/shared-types';
import { api } from '../client.js';
import { hashGoal } from '../hash-goal.js';
import { queryKeys } from '../keys.js';

function fetchExplanation(farmId: string, femaleId: string, naab: string, goal: BreedingGoal) {
  return api.post(
    `/farms/${farmId}/females/${femaleId}/matches/${naab}/explanation`,
    { goal },
    ExplanationSchema,
  );
}

/** REQ-D-05: solo se pide para la fila expandida — `enabled` lo controla el
 * llamador. El caché de React Query (misma key) evita re-pedirla al
 * colapsar/expandir de nuevo la misma fila. */
export function useExplanation(
  farmId: string,
  femaleId: string,
  naab: string,
  goal: BreedingGoal,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.explanation(farmId, femaleId, naab, hashGoal(goal)),
    queryFn: () => fetchExplanation(farmId, femaleId, naab, goal),
    enabled,
    staleTime: Infinity,
  });
}

/** Q4: prefetch de la fila siguiente al expandir una. */
export function usePrefetchExplanation() {
  const queryClient = useQueryClient();
  return (farmId: string, femaleId: string, naab: string, goal: BreedingGoal) =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.explanation(farmId, femaleId, naab, hashGoal(goal)),
      queryFn: () => fetchExplanation(farmId, femaleId, naab, goal),
      staleTime: Infinity,
    });
}
