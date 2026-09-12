import { useQuery } from '@tanstack/react-query';
import type { BreedingGoal } from '@org/shared-types';
import { MatchBoardSchema } from '@org/shared-types';
import { api } from '../client.js';
import { hashGoal } from '../hash-goal.js';
import { queryKeys } from '../keys.js';

/** B4/D4: matching de una hembra puntual (REQ-D-01). 409 HERD_NOT_CLASSIFIED
 * llega como ApiClientError con ese code — la pantalla lo muestra con
 * ErrorMessage, nunca un mensaje inventado. */
export function useMatchBoard(
  farmId: string,
  femaleId: string | undefined,
  goal: BreedingGoal,
) {
  return useQuery({
    queryKey: queryKeys.matches(farmId, femaleId ?? '', hashGoal(goal)),
    queryFn: () =>
      api.post(
        `/farms/${farmId}/females/${femaleId}/matches`,
        { goal },
        MatchBoardSchema,
      ),
    enabled: Boolean(farmId && femaleId),
  });
}
