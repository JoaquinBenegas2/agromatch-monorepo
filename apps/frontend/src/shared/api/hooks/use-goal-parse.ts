import { useMutation } from '@tanstack/react-query';
import { BreedingGoalSchema } from '@org/shared-types';
import { api } from '../client.js';

/** C5 — REQ-D-07: solo se llama cuando hay texto; con texto vacío, la
 * pantalla usa el preset directo sin pegarle a este endpoint. */
export function useGoalParse() {
  return useMutation({
    mutationFn: (text: string) => api.post('/goals/parse', { text }, BreedingGoalSchema),
  });
}
