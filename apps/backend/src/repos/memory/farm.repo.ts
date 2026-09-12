import { Injectable } from '@nestjs/common';
import type { Farm } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { FarmRepo } from '../farm.port.js';

@Injectable()
export class InMemoryFarmRepo implements FarmRepo {
  constructor(private readonly store: MemoryStore) {}

  async findByIds(ids: string[]): Promise<Farm[]> {
    const wanted = new Set(ids);
    const result: Farm[] = [];
    for (const farm of this.store.farms.values()) {
      if (wanted.has(farm.id)) result.push(structuredClone(farm));
    }
    return result;
  }

  async findById(id: string): Promise<Farm | null> {
    const farm = this.store.farms.get(id);
    return farm ? structuredClone(farm) : null;
  }
}
