import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { BullSchema } from '@org/shared-types';
import { api } from '../client.js';
import { queryKeys } from '../keys.js';

export function useBulls() {
  return useQuery({
    queryKey: queryKeys.bulls(),
    queryFn: () => api.get('/bulls', z.array(BullSchema)),
  });
}
