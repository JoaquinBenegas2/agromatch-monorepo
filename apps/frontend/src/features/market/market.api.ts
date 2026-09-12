import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MatchBoardSchema,
  NeedSchema,
  PublicProviderSchema,
  ServiceRequestSchema,
  type CreateNeedBody,
  type CreateServiceRequestBody,
  type NeedCategory,
  type UpdateNeedBody,
} from '@org/shared-types';
import { z } from 'zod';
import { api } from '../../shared/api/client.js';
import { queryKeys } from '../../shared/api/keys.js';

const PublicProvidersSchema = z.array(PublicProviderSchema);

export function useProviders(category?: NeedCategory) {
  return useQuery({
    queryKey: ['providers', category ?? 'all'],
    queryFn: () =>
      api.get(
        `/providers${category ? `?category=${encodeURIComponent(category)}` : ''}`,
        PublicProvidersSchema,
      ),
    enabled: category !== undefined,
  });
}

export function useCreateNeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNeedBody) => api.post('/needs', body, NeedSchema),
    onSuccess: (need) => {
      queryClient.setQueryData(queryKeys.needs(need.farmId), (current: unknown) =>
        Array.isArray(current) ? [...current, need] : [need],
      );
    },
  });
}

export function useUpdateNeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateNeedBody }) =>
      api.patch(`/needs/${id}`, body, NeedSchema),
    onSuccess: (need) => {
      queryClient.setQueryData(queryKeys.needs(need.farmId), (current: unknown) =>
        Array.isArray(current)
          ? current.map((item) =>
              typeof item === 'object' && item !== null && 'id' in item && item.id === need.id
                ? need
                : item,
            )
          : [need],
      );
    },
  });
}

export function useMatchNeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (needId: string) => api.post(`/needs/${needId}/matches`, undefined, MatchBoardSchema),
    onSuccess: (board, needId) => queryClient.setQueryData(queryKeys.needMatches(needId), board),
  });
}

export function useCreateServiceRequest() {
  return useMutation({
    mutationFn: ({ needId, body }: { needId: string; body: CreateServiceRequestBody }) =>
      api.post(`/needs/${needId}/requests`, body, ServiceRequestSchema),
  });
}
