import type { MatchBoard, Need } from '@org/shared-types';

export interface NeedRepo {
  create(n: Need): Promise<Need>;
  update(n: Need): Promise<Need>;
  findById(id: string): Promise<Need | null>;
  listByFarm(farmId: string, opts?: { includeSynthetic?: boolean }): Promise<Need[]>;
  saveMatchBoard(id: string, board: MatchBoard): Promise<void>;
}

export const NEED_REPO = Symbol('NEED_REPO');
