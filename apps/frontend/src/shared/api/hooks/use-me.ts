import { useQuery } from '@tanstack/react-query';
import { MeResponseSchema } from '@org/shared-types';
import { api } from '../client.js';
import { queryKeys } from '../keys.js';

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => api.get('/me', MeResponseSchema),
  });
}
