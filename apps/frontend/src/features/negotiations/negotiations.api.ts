import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  NegotiationSchema,
  type SendNegotiationMessageBody,
} from '@org/shared-types';
import { z } from 'zod';
import { api } from '../../shared/api/client.js';
import { queryKeys } from '../../shared/api/keys.js';
import { useUser } from '../../shared/user/user-context.js';

const NegotiationsSchema = z.array(NegotiationSchema);

export function useNegotiations() {
  const { user } = useUser();
  return useQuery({
    queryKey: [...queryKeys.negotiations(), user.id],
    queryFn: () => api.get('/negotiations', NegotiationsSchema),
    refetchInterval: 5000,
  });
}

function useRefreshNegotiations() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  return (negotiation: z.infer<typeof NegotiationSchema>) => {
    queryClient.setQueryData(
      [...queryKeys.negotiations(), user.id],
      (current: unknown) =>
        Array.isArray(current)
          ? [
              negotiation,
              ...current.filter(
                (item) =>
                  item &&
                  typeof item === 'object' &&
                  'id' in item &&
                  item.id !== negotiation.id,
              ),
            ]
          : [negotiation],
    );
  };
}

export function useSendNegotiationMessage() {
  const refresh = useRefreshNegotiations();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: SendNegotiationMessageBody;
    }) => api.post(`/negotiations/${id}/messages`, body, NegotiationSchema),
    onSuccess: refresh,
  });
}
