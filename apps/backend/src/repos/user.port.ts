import type { User } from '@org/shared-types';

export interface UserRepo {
  findById(id: string): Promise<User | null>;
}

export const USER_REPO = Symbol('USER_REPO');
