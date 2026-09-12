import { Inject, Injectable } from '@nestjs/common';
import type {
  ColumnMapping,
  HerdImportResult,
  HerdIngestionPort,
  MappingProposal,
} from '@org/shared-types';
import { randomUUID } from 'node:crypto';
import { HERD_INGESTION_PORT } from '../ai/tokens.js';
import { DomainError } from '../common/errors/domain-error.js';
import {
  CLASSIFICATION_REPO,
  type ClassificationRepo,
} from '../repos/classification.port.js';
import { FEMALE_REPO, type FemaleRepo } from '../repos/female.port.js';
import {
  HERD_IMPORT_REPO,
  type HerdImportRepo,
} from '../repos/herd-import.port.js';
import { PLAN_REPO, type PlanRepo } from '../repos/plan.port.js';

@Injectable()
export class HerdImportService {
  constructor(
    @Inject(HERD_INGESTION_PORT) private readonly ingestion: HerdIngestionPort,
    @Inject(HERD_IMPORT_REPO) private readonly imports: HerdImportRepo,
    @Inject(FEMALE_REPO) private readonly females: FemaleRepo,
    @Inject(CLASSIFICATION_REPO)
    private readonly classifications: ClassificationRepo,
    @Inject(PLAN_REPO) private readonly plans: PlanRepo,
  ) {}
  async create(
    farmId: string,
    file: Express.Multer.File,
  ): Promise<{ importId: string; proposal: MappingProposal }> {
    if (!/\.xlsx?$/i.test(file.originalname))
      throw new DomainError(
        'FILE_NOT_SPREADSHEET',
        'El archivo debe ser .xls o .xlsx',
        400,
      );
    try {
      const proposal = await this.ingestion.proposeMapping(
        new Uint8Array(file.buffer),
        file.originalname,
      );
      const importId = randomUUID();
      await this.imports.save(
        importId,
        farmId,
        new Uint8Array(file.buffer),
        file.originalname,
        proposal,
      );
      return { importId, proposal };
    } catch (error) {
      if (error instanceof Error && error.name === 'HerdIngestionError')
        throw new DomainError('HEADER_ROW_NOT_FOUND', error.message, 422);
      throw error;
    }
  }
  async confirm(
    farmId: string,
    importId: string,
    mapping: ColumnMapping,
  ): Promise<HerdImportResult> {
    const pending = await this.imports.get(importId);
    if (!pending || pending.farmId !== farmId)
      throw new DomainError(
        'HERD_IMPORT_NOT_FOUND',
        'No se encontró la importación para este tambo',
        404,
      );
    try {
      const result = await this.ingestion.applyMapping(
        pending.file,
        mapping,
        farmId,
      );
      if (!result.females.length)
        throw new DomainError(
          'HERD_IMPORT_EMPTY',
          'No hay filas válidas para importar. Se conserva el rodeo actual.',
          422,
          { rowsRejected: result.rowsRejected },
        );
      if (
        new Set(result.females.map((f) => f.visualId)).size !==
        result.females.length
      )
        throw new DomainError(
          'HERD_IMPORT_DUPLICATE_ID',
          'El archivo tiene caravanas repetidas. Corregilas antes de confirmar.',
          422,
        );
      const females = result.females.map((female) =>
        female.profile
          ? {
              ...female,
              profile: { ...female.profile, source: pending.filename },
            }
          : female,
      );
      await this.females.upsertMany(farmId, females);
      const previous = await this.classifications.listByFarm(farmId);
      if (previous)
        await this.classifications.replaceForFarm(farmId, previous.goal, []);
      const plan = await this.plans.getOrCreate(farmId);
      await this.plans.save({
        ...plan,
        items: [],
        totals: {
          doses: { SEXED: 0, CONVENTIONAL: 0, BEEF: 0 },
          cost: 0,
          avgExpectedProgeny: {},
        },
      });
      const persisted = await this.females.listByFarm(farmId);
      return {
        ...result,
        females: persisted,
        warnings: [
          ...result.warnings,
          'Clasificación y plan reiniciados. Clasificá el rodeo actualizado antes de guardar nuevos encuentros.',
        ],
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'HerdIngestionError')
        throw new DomainError('MAPPING_INCOMPLETE', error.message, 422);
      throw error;
    }
  }
}
