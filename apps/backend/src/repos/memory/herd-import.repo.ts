import { Injectable } from '@nestjs/common';
import type { MappingProposal } from '@org/shared-types';
import { MemoryStore, type StoredHerdImport } from './memory-store.js';
import type { HerdImportRepo } from '../herd-import.port.js';

@Injectable()
export class InMemoryHerdImportRepo implements HerdImportRepo {
  constructor(private readonly store: MemoryStore) {}

  async save(
    importId: string,
    farmId: string,
    file: Uint8Array,
    filename: string,
    proposal: MappingProposal,
  ): Promise<void> {
    const stored: StoredHerdImport = {
      farmId,
      file: new Uint8Array(file),
      filename,
      proposal: structuredClone(proposal),
    };
    this.store.herdImports.set(importId, stored);
  }

  async get(
    importId: string,
  ): Promise<{ farmId: string; file: Uint8Array; filename: string; proposal: MappingProposal } | null> {
    const stored = this.store.herdImports.get(importId);
    if (!stored) return null;
    return {
      farmId: stored.farmId,
      file: new Uint8Array(stored.file),
      filename: stored.filename,
      proposal: structuredClone(stored.proposal),
    };
  }
}
