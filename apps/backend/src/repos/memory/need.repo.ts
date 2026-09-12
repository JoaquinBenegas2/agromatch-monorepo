import { Injectable } from '@nestjs/common';
import type { MatchBoard, Need } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { NeedRepo } from '../need.port.js';

@Injectable()
export class InMemoryNeedRepo implements NeedRepo {
  constructor(private readonly store: MemoryStore) {}

  async create(n: Need): Promise<Need> {
    const stored = structuredClone(n);
    this.store.needs.set(stored.id, stored);
    return structuredClone(stored);
  }

  async update(n: Need): Promise<Need> {
    if (!this.store.needs.has(n.id)) {
      throw new Error(`Need not found: ${n.id}`);
    }
    const stored = structuredClone(n);
    this.store.needs.set(stored.id, stored);
    return structuredClone(stored);
  }

  async findById(id: string): Promise<Need | null> {
    const need = this.store.needs.get(id);
    return need ? structuredClone(need) : null;
  }

  async listByFarm(farmId: string, opts?: { includeSynthetic?: boolean }): Promise<Need[]> {
    const result: Need[] = [];
    for (const need of this.store.needs.values()) {
      if (need.farmId !== farmId) continue;
      if (!opts?.includeSynthetic && need.synthetic) continue;
      result.push(structuredClone(need));
    }
    return result;
  }

  async saveMatchBoard(id: string, board: MatchBoard): Promise<void> {
    if (!this.store.needs.has(id)) {
      throw new Error(`Need not found: ${id}`);
    }
    this.store.matchBoards.set(id, structuredClone(board));
  }
}
