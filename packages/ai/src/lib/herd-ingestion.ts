import * as XLSX from 'xlsx';
import { deriveCategory } from '@org/genetics-core';
import { MappingProposalSchema, type ColumnMapping, type Female, type FemaleField, type HerdImportResult, type HerdIngestionPort, type LlmClient, type MappingProposal, type TraitKey } from '@org/shared-types';

export class HerdIngestionError extends Error {
  constructor(public readonly code: 'HEADER_ROW_NOT_FOUND' | 'MAPPING_INCOMPLETE', message: string) { super(message); this.name = 'HerdIngestionError'; }
}

const traits: TraitKey[] = ['ci', 'milk', 'fat', 'pro', 'pl', 'scs', 'fs', 'rfi'];
const ranges: Record<TraitKey, [number, number]> = { ci: [0, 1000], milk: [-5000, 5000], fat: [-1000, 1000], pro: [-1000, 1000], pl: [-10, 10], scs: [2, 4], fs: [-10, 10], rfi: [-1000, 1000] };

type Row = unknown[];
const cellText = (value: unknown) => value === null || value === undefined ? '' : String(value).trim();
const asNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : Number(cellText(value).replace(',', '.'));

function readFirstSheet(file: Uint8Array): Row[] {
  const book = XLSX.read(file, { type: 'array', cellDates: true, raw: true });
  const sheet = book.Sheets[book.SheetNames[0] ?? ''];
  if (!sheet) throw new HerdIngestionError('HEADER_ROW_NOT_FOUND', 'Se esperaba una primera hoja con una tabla de encabezados');
  return XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, raw: true, defval: '' });
}

function headerIndex(rows: Row[]): number {
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].filter((value) => cellText(value) !== '' && Number.isNaN(asNumber(value))).length < 6) continue;
    const evidence = rows.slice(i + 1, i + 6).some((row) => row.some((value) => Number.isFinite(asNumber(value))));
    if (evidence) return i;
  }
  throw new HerdIngestionError('HEADER_ROW_NOT_FOUND', 'Se esperaba una fila de encabezados con al menos 6 textos y valores numéricos posteriores');
}

function formatDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') { const parsed = XLSX.SSF.parse_date_code(value); if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`; }
  const raw = cellText(value); if (!raw) return null;
  const parsed = new Date(raw); return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function requiredMapping(mapping: ColumnMapping): void {
  const destinations = Object.values(mapping.columns).filter((value) => value !== 'IGNORE');
  if (!destinations.includes('visualId') || !destinations.includes('birthDate') || new Set(destinations).size !== destinations.length) {
    throw new HerdIngestionError('MAPPING_INCOMPLETE', 'El mapeo debe incluir visualId y birthDate sin destinos duplicados');
  }
}

export class HerdIngestion implements HerdIngestionPort {
  constructor(private readonly llm: LlmClient) {}

  async proposeMapping(file: Uint8Array, filename: string): Promise<MappingProposal> {
    const rows = readFirstSheet(file); const row = headerIndex(rows); const headers = rows[row].map(cellText).filter(Boolean);
    const sample = rows.slice(row + 1, row + 6).map((values) => Object.fromEntries(headers.map((header, i) => [header, /visual|caravana|id/i.test(header) ? '***' : cellText(values[i])])));
    const proposal = await this.llm.completeJson({ system: 'Mapeás columnas de un Excel de genotipado bovino. Usá solamente destinos permitidos o IGNORE.', user: JSON.stringify({ filename, headerRow: row, headers, sample }), maxTokens: 1200 }, MappingProposalSchema);
    return MappingProposalSchema.parse(proposal);
  }

  async applyMapping(file: Uint8Array, mapping: ColumnMapping, farmId: string): Promise<HerdImportResult> {
    requiredMapping(mapping); const rows = readFirstSheet(file); const header = rows[mapping.headerRow];
    if (!header) throw new HerdIngestionError('HEADER_ROW_NOT_FOUND', 'La fila de encabezados indicada no existe');
    const columns = new Map<string, number>(); header.forEach((value, index) => columns.set(cellText(value), index));
    const females: Female[] = [], rowsRejected: { row: number; reason: string }[] = [], warnings: string[] = [];
    for (let rowIndex = mapping.headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex]; const get = (field: FemaleField) => { const source = Object.entries(mapping.columns).find(([, target]) => target === field)?.[0]; return source === undefined ? '' : row[columns.get(source) ?? -1]; };
      const visualId = cellText(get('visualId')), birthDate = formatDate(get('birthDate'));
      const numericValues = traits.map((trait) => get(trait));
      if (!visualId || !birthDate) { if (row.some((v) => cellText(v))) rowsRejected.push({ row: rowIndex + 1, reason: 'Fila vacía, nota o faltan identificación/fecha' }); continue; }
      const present = numericValues.filter((value) => cellText(value) !== '');
      if (present.length > 0 && present.length !== traits.length) { rowsRejected.push({ row: rowIndex + 1, reason: 'Faltan rasgos de genotipado; no se imputan valores' }); continue; }
      let profile: Female['profile'] = null;
      if (present.length === traits.length) {
        const values = Object.fromEntries(traits.map((trait) => [trait, asNumber(get(trait))])) as Record<TraitKey, number>;
        const invalid = traits.find((trait) => !Number.isFinite(values[trait]) || values[trait] < ranges[trait][0] || values[trait] > ranges[trait][1]);
        if (invalid) { const value = values[invalid]; rowsRejected.push({ row: rowIndex + 1, reason: `${invalid.toUpperCase()} ${String(value).replace('.', ',')} fuera del rango ${ranges[invalid][0]}–${ranges[invalid][1]}` }); continue; }
        const beta = cellText(get('betaCasein')) || null, kappa = cellText(get('kappaCasein')) || null;
        profile = { traits: values, betaCasein: beta as Female['profile'] extends infer P ? P extends { betaCasein: infer B } ? B : never : never, kappaCasein: kappa as Female['profile'] extends infer P ? P extends { kappaCasein: infer K } ? K : never : never, scale: 'CDCB', source: 'herd-import' };
      } else warnings.push(`${visualId}: sin genotipado, queda fuera del motor`);
      const sireNaab = cellText(get('sireNaab')) || null; if (!sireNaab) warnings.push(`${visualId}: sin padre registrado`);
      females.push({ id: `${farmId}:${visualId}`, farmId, visualId, birthDate, sireNaab, category: deriveCategory(birthDate, new Date().toISOString().slice(0, 10)), profile });
    }
    return { females, rowsOk: females.length, rowsRejected, warnings };
  }
}
