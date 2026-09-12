import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import type { LlmClient } from '@org/shared-types';
import { HerdIngestion, HerdIngestionError } from './herd-ingestion.js';

const workbook = (rows: unknown[][]) => { const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Datos'); return XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer; };
const llm: LlmClient = { completeText: async () => '', completeJson: async <T>() => ({ headerRow: 1, columns: { VISUALID: 'visualId', Nacimiento: 'birthDate', CI: 'ci', MILK: 'milk', FAT: 'fat', PRO: 'pro', PL: 'pl', SCS: 'scs', FS: 'fs', RFI: 'rfi' }, confidence: {}, warnings: [] }) as T };
const rows = [['Título del productor'], ['VISUALID', 'Nacimiento', 'CI', 'MILK', 'FAT', 'PRO', 'PL', 'SCS', 'FS', 'RFI'], ['C136', '2025-01-01', 400, 1, 1, 1, 1, 3, 1, 1]];
describe('HerdIngestion', () => {
  it('preserves alphanumeric visual identifiers and finds the header after titles', async () => { const ingestion = new HerdIngestion(llm); const file = new Uint8Array(workbook(rows)); const proposal = await ingestion.proposeMapping(file, 'herd.xlsx'); expect(proposal.headerRow).toBe(1); const result = await ingestion.applyMapping(file, proposal, 'farm-a'); expect(result.females[0]?.visualId).toBe('C136'); });
  it('rejects a sheet without a table header', async () => { await expect(new HerdIngestion(llm).proposeMapping(new Uint8Array(workbook([['solo texto'], ['otra nota']])),'empty.xlsx')).rejects.toBeInstanceOf(HerdIngestionError); });
});
