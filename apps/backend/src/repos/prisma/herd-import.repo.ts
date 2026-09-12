import { Injectable } from '@nestjs/common';
import type { MappingProposal } from '@org/shared-types';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { HerdImportRepo } from '../herd-import.port.js';

@Injectable()
export class PrismaHerdImportRepo implements HerdImportRepo {
  constructor(private readonly prisma: PrismaService) {}

  async save(
    importId: string,
    farmId: string,
    file: Uint8Array,
    filename: string,
    proposal: MappingProposal,
  ): Promise<void> {
    await this.prisma.herdImport.upsert({
      where: { id: importId },
      create: { id: importId, farmId, file: Buffer.from(file), filename, proposal: proposal as object },
      update: { farmId, file: Buffer.from(file), filename, proposal: proposal as object },
    });
  }

  async get(
    importId: string,
  ): Promise<{ farmId: string; file: Uint8Array; filename: string; proposal: MappingProposal } | null> {
    const row = await this.prisma.herdImport.findUnique({ where: { id: importId } });
    if (!row) return null;
    return {
      farmId: row.farmId,
      file: new Uint8Array(row.file),
      filename: row.filename,
      proposal: row.proposal as MappingProposal,
    };
  }
}
