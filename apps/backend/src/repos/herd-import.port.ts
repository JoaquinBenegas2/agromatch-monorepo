import type { MappingProposal } from '@org/shared-types';

export interface HerdImportRepo {
  save(
    importId: string,
    farmId: string,
    file: Uint8Array,
    filename: string,
    proposal: MappingProposal,
  ): Promise<void>;
  get(
    importId: string,
  ): Promise<{ farmId: string; file: Uint8Array; filename: string; proposal: MappingProposal } | null>;
}

export const HERD_IMPORT_REPO = Symbol('HERD_IMPORT_REPO');
