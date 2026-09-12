import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ServiceRequestSchema,
  type ContactGeneticMatch,
} from '@org/shared-types';
import { api } from '@/shared/api/client';
import { queryKeys } from '@/shared/api/keys';
export function useContactGeneticMatch(farmId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      femaleId,
      bullNaab,
      ...body
    }: ContactGeneticMatch & { femaleId: string; bullNaab: string }) =>
      api.post(
        `/farms/${farmId}/females/${encodeURIComponent(femaleId)}/matches/${encodeURIComponent(bullNaab)}/request`,
        body,
        ServiceRequestSchema,
      ),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.negotiations() }),
  });
}
