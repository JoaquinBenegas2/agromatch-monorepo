import type { BreedingGoal } from '@org/shared-types';

/** Hash estable de un `BreedingGoal`, usado para invalidar clasificaciones viejas. */
export function hashGoal(goal: BreedingGoal): string {
  const stable = JSON.stringify(goal, Object.keys(goal).sort());
  let hash = 0;
  for (let i = 0; i < stable.length; i++) {
    hash = (Math.imul(31, hash) + stable.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}
