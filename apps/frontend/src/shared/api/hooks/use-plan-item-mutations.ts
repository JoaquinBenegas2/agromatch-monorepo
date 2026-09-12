import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BreedingGoal, SavePlanItem } from '@org/shared-types';
import { BreedingPlanSchema } from '@org/shared-types';
import { api } from '../client.js';
import { queryKeys } from '../keys.js';

/** REQ-D-08: "Elegir para el plan" — un toro por hembra, reemplaza si ya
 * había uno. El endpoint real lo entrega la sección "B5+D5" de la ruta; el
 * botón ya queda conectado acá para no tocar esta pantalla de nuevo después. */
export function useAddPlanItem(farmId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: SavePlanItem) =>
      api.post(`/farms/${farmId}/plan/items`, item, BreedingPlanSchema),
    onSuccess: (plan) => {
      queryClient.setQueryData(queryKeys.plan(farmId), plan);
    },
  });
}

export function useRemovePlanItem(farmId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (femaleId: string) =>
      api.delete(`/farms/${farmId}/plan/items/${femaleId}`, BreedingPlanSchema),
    onSuccess: (plan) => {
      queryClient.setQueryData(queryKeys.plan(farmId), plan);
    },
  });
}

/** REQ-D-11: "Plan automático" completa el resto del rodeo según el objetivo. */
export function useAutoPlan(farmId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: BreedingGoal) =>
      api.post(`/farms/${farmId}/plan/auto`, { goal }, BreedingPlanSchema),
    onSuccess: (plan) => {
      queryClient.setQueryData(queryKeys.plan(farmId), plan);
    },
  });
}
