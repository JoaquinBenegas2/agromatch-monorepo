import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BreedingGoal, PlanItem } from '@org/shared-types';
import { BreedingPlanSchema } from '@org/shared-types';
import { api } from '../client.js';
import { queryKeys } from '../keys.js';

/**
 * D4 (`addItem`/`removeItem`, "Elegir para el plan" en el Matching) y D5
 * (`useAutoPlan`, "Plan automático"). Nota: este archivo también puede
 * existir en la PR de B4+D4 — mismo `addItem`/`removeItem`, se resuelve
 * trivial al mergear en orden.
 */
export function useAddPlanItem(farmId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: PlanItem) => api.post(`/farms/${farmId}/plan/items`, item, BreedingPlanSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plan(farmId ?? '') });
    },
  });
}

export function useRemovePlanItem(farmId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (femaleId: string) =>
      api.delete(`/farms/${farmId}/plan/items/${femaleId}`, BreedingPlanSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plan(farmId ?? '') });
    },
  });
}

/** REQ-D-11: "Plan automático" completa el resto del rodeo según el objetivo. */
export function useAutoPlan(farmId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: BreedingGoal) =>
      api.post(`/farms/${farmId}/plan/auto`, { goal }, BreedingPlanSchema),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plan(farmId ?? '') });
    },
  });
}
