import type { User } from '@org/shared-types';
import { users } from '@org/shared-types/fixtures';

/** Los 4 usuarios simulados (`users.json`), elegidos desde la fila de cuenta del sidebar. */
export const SIMULATED_USERS: User[] = users;

export function findUser(id: string): User | undefined {
  return SIMULATED_USERS.find((u) => u.id === id);
}
