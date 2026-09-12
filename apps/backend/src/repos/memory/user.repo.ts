import { Injectable } from '@nestjs/common';
import type { User } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { UserRepo } from '../user.port.js';

@Injectable()
export class InMemoryUserRepo implements UserRepo {
  constructor(private readonly store: MemoryStore) {}

  async findById(id: string): Promise<User | null> {
    const user = this.store.users.get(id);
    return user ? structuredClone(user) : null;
  }
}
