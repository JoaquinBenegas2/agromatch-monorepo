import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  ClassificationSchema,
  ClassificationSummarySchema,
  FemaleWithClassificationSchema,
  HerdImportConfirmResponseSchema,
  HerdImportResultSchema,
  type ColumnMapping,
  type BreedingGoal,
} from '@org/shared-types';
import { api } from '../client.js';
import { queryKeys } from '../keys.js';
export const useFemales = (farmId: string) =>
  useQuery({
    queryKey: queryKeys.farmFemales(farmId),
    queryFn: () =>
      api.get(
        `/farms/${farmId}/females`,
        z.array(FemaleWithClassificationSchema),
      ),
    enabled: Boolean(farmId),
  });
export const useClassificationSummary = (farmId: string) =>
  useQuery({
    queryKey: queryKeys.classificationSummary(farmId),
    queryFn: () =>
      api.get(
        `/farms/${farmId}/classifications/summary`,
        ClassificationSummarySchema,
      ),
    retry: false,
  });
export function useUploadHerd(farmId: string) {
  return useMutation({
    mutationFn: (file: File) =>
      api.upload(
        `/farms/${farmId}/herd-imports`,
        file,
        HerdImportConfirmResponseSchema,
      ),
  });
}
export function useConfirmHerd(farmId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      importId,
      mapping,
    }: {
      importId: string;
      mapping: ColumnMapping;
    }) =>
      api.post(
        `/farms/${farmId}/herd-imports/${importId}/confirm`,
        mapping,
        HerdImportResultSchema,
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['farms', farmId] }),
        queryClient.invalidateQueries({ queryKey: ['explanation', farmId] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.advisorOverview(),
        }),
      ]),
  });
}
export function useClassifyHerd(farmId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: BreedingGoal) =>
      api.post(
        `/farms/${farmId}/classifications`,
        { goal },
        z.array(ClassificationSchema),
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['farms', farmId] }),
        queryClient.invalidateQueries({ queryKey: ['explanation', farmId] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.advisorOverview(),
        }),
      ]),
  });
}
