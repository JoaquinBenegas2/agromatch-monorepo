import { Injectable } from '@nestjs/common';
import type { Bull } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { BullRepo } from '../bull.port.js';

@Injectable()
export class InMemoryBullRepo implements BullRepo {
  constructor(private readonly store: MemoryStore) {}

  async list(): Promise<Bull[]> {
    return [...this.store.bulls.values()].map((b) => structuredClone(b));
  }

  async findByNaab(naab: string): Promise<Bull | null> {
    const bull = this.store.bulls.get(naab);
    return bull ? structuredClone(bull) : null;
  }

  async upsertMany(bulls: Bull[]): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;
    for (const bull of bulls) {
      const existing = this.store.bulls.has(bull.naab);
      this.store.bulls.set(bull.naab, structuredClone(bull));
      if (existing) updated += 1;
      else added += 1;
    }
    return { added, updated };
  }
}
