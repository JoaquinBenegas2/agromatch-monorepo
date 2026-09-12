import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NegotiationSchema,
  type SendNegotiationMessageBody,
} from '@org/shared-types';
import { z } from 'zod';
import { api } from '../../shared/api/client.js';
import { queryKeys } from '../../shared/api/keys.js';

const NegotiationsSchema = z.array(NegotiationSchema);

export function useNegotiations() {
  return useQuery({
    queryKey: queryKeys.negotiations(),
    queryFn: () => api.get('/negotiations', NegotiationsSchema),
    refetchInterval: 5000,
  });
}

function useRefreshNegotiations() {
  const queryClient = useQueryClient();
  return (negotiation: z.infer<typeof NegotiationSchema>) => {
    queryClient.setQueryData(queryKeys.negotiations(), (current: unknown) =>
      Array.isArray(current)
        ? [negotiation, ...current.filter((item) => item && typeof item === 'object' && 'id' in item && item.id !== negotiation.id)]
        : [negotiation],
    );
  };
}

export function useSendNegotiationMessage() {
  const refresh = useRefreshNegotiations();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SendNegotiationMessageBody }) =>
      api.post(`/negotiations/${id}/messages`, body, NegotiationSchema),
    onSuccess: refresh,
  });
}
