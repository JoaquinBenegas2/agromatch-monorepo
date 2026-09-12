import type { BreedingGoal } from '@org/shared-types';

/**
 * Hash determinístico de un objetivo para usar como parte de la query key
 * (decisión D6 de mvp-d-match/design.md): el mismo criterio que el backend
 * usa para cachear la explicación, duplicado acá porque cruzar la frontera
 * front/back por una función de 4 líneas no vale la dependencia nueva.
 */
export function hashGoal(goal: BreedingGoal): string {
  const weights = Object.keys(goal.weights)
    .sort()
    .map((k) => `${k}:${goal.weights[k as keyof typeof goal.weights]}`)
    .join(',');
  return `${goal.preset}|${weights}|${goal.wantBetaA2}|${goal.wantKappaBB}`;
}
