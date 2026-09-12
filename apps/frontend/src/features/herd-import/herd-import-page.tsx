import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UploadCloud } from 'lucide-react';
import {
  FemaleFieldSchema,
  type ColumnMapping,
  type MappingProposal,
} from '@org/shared-types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorMessage } from '@/components/ui/error-message';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SpatialScene } from '@/components/spatial/spatial-scene';
import { useConfirmHerd, useUploadHerd } from '@/shared/api/hooks/use-herd';
import {
  GeneticsHeading,
  useGeneticsMotion,
} from '../genetics/genetics-experience';

const FIELDS = [
  'visualId',
  'birthDate',
  'sireNaab',
  'ci',
  'milk',
  'fat',
  'pro',
  'pl',
  'scs',
  'fs',
  'rfi',
  'betaCasein',
  'kappaCasein',
  'IGNORE',
] as const;
const FIELD_LABEL: Record<string, string> = {
  visualId: 'Caravana',
  birthDate: 'Fecha de nacimiento',
  sireNaab: 'Padre / NAAB',
  betaCasein: 'Beta caseína',
  kappaCasein: 'Kappa caseína',
  IGNORE: 'No usar',
  ci: 'CI',
  milk: 'Leche',
  fat: 'Grasa',
  pro: 'Proteína',
  pl: 'Vida productiva',
  scs: 'SCS',
  fs: 'Fertilidad',
  rfi: 'RFI',
};
export function UploadHerdButton() {
  const navigate = useNavigate();
  return (
    <Button
      variant="secondary"
      onClick={() => navigate('/motor-genetico/importar')}
    >
      Subir Excel
    </Button>
  );
}

export function HerdImportPage({ farmId }: { farmId: string }) {
  const upload = useUploadHerd(farmId),
    confirm = useConfirmHerd(farmId);
  const [proposal, setProposal] = useState<MappingProposal | null>(null);
  const [importId, setImportId] = useState(''),
    [filename, setFilename] = useState('');
  const [reviewed, setReviewed] = useState<string[]>([]),
    [fileError, setFileError] = useState('');
  const { still } = useGeneticsMotion();
  const low = Object.entries(proposal?.confidence ?? {})
    .filter(([, n]) => n < 0.8)
    .map(([header]) => header);
  const fields = Object.values(proposal?.columns ?? {}).filter(
    (v) => v !== 'IGNORE',
  );
  const mappingValid =
    fields.includes('visualId') &&
    fields.includes('birthDate') &&
    new Set(fields).size === fields.length;
  const step = confirm.data ? 2 : proposal ? 1 : 0;
  function submit(file: File) {
    if (upload.isPending || confirm.isPending) return;
    if (!/\.xlsx?$/i.test(file.name)) {
      setFileError('Elegí un archivo Excel .xls o .xlsx.');
      return;
    }
    setFileError('');
    setReviewed([]);
    setProposal(null);
    confirm.reset();
    setFilename(file.name);
    upload.mutate(file, {
      onSuccess: (result) => {
        setProposal(result.proposal);
        setImportId(result.importId);
      },
    });
  }
  return (
    <section className="gx-view gx-import">
      <GeneticsHeading
        index="00"
        eyebrow="ORIGEN / DE DATOS A POSIBILIDADES"
        title="Una planilla."
        accent="Un mundo."
        description="Las filas se desprenden del papel. Cada una encuentra su lugar en el paisaje."
      >
        <div className="gx-import-steps">
          {['ARCHIVO', 'COLUMNAS', 'RODEO VIVO'].map((label, i) => (
            <span key={label} aria-current={step === i ? 'step' : undefined}>
              0{i + 1} / {label}
            </span>
          ))}
        </div>
      </GeneticsHeading>
      <SpatialScene
        kind={confirm.data ? 'herd' : 'import'}
        className="gx-world"
        options={{
          immersive: true,
          reduced: () => still,
          paused: () => still,
          animals: confirm.data
            ? () =>
                confirm.data.females.map((f) => ({
                  id: f.id,
                  group: 'UNCLASSIFIED' as const,
                }))
            : undefined,
        }}
      />
      {!proposal && !confirm.data && (
        <div
          className="gx-upload gx-panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) submit(file);
          }}
        >
          <UploadCloud className="text-primary" />
          <h2 className="mt-4 text-xl">Tu rodeo empieza acá.</h2>
          <label htmlFor="herd-file">
            Soltá tu Excel o elegilo desde tu equipo.
          </label>
          <input
            id="herd-file"
            aria-label="Archivo Excel"
            type="file"
            accept=".xls,.xlsx"
            disabled={upload.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) submit(file);
            }}
          />
          <p className="gx-note mt-4" aria-live="polite">
            {upload.isPending
              ? `Leyendo ${filename} y proponiendo las columnas…`
              : 'Primero revisás las columnas. El rodeo se actualiza al confirmar.'}
          </p>
        </div>
      )}
      {(fileError || upload.error || confirm.error) && (
        <div className="gx-panel mt-5 max-w-md">
          <ErrorMessage
            message={
              fileError ||
              ((upload.error ?? confirm.error)?.message ??
                'No se pudo importar el archivo')
            }
          />
        </div>
      )}
      {proposal && !confirm.data && (
        <section className="gx-mapping gx-panel">
          <p className="gx-eyebrow">02 / {filename}</p>
          <h2>Dale sentido a cada columna.</h2>
          <div className="max-h-[330px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Columna</TableHead>
                  <TableHead>Interpretación</TableHead>
                  <TableHead>Revisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(proposal.columns).map(([header, target]) => (
                  <TableRow key={header}>
                    <TableCell>{header}</TableCell>
                    <TableCell>
                      <select
                        aria-label={`Interpretación de ${header}`}
                        value={target}
                        onChange={(e) => {
                          const next =
                            e.target.value === 'IGNORE'
                              ? 'IGNORE'
                              : FemaleFieldSchema.parse(e.target.value);
                          setProposal({
                            ...proposal,
                            columns: { ...proposal.columns, [header]: next },
                          });
                          setReviewed((current) => [
                            ...new Set([...current, header]),
                          ]);
                        }}
                      >
                        {FIELDS.map((f) => (
                          <option key={f} value={f}>
                            {FIELD_LABEL[f]}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      {low.includes(header) ? (
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={reviewed.includes(header)}
                            onCheckedChange={(value) =>
                              setReviewed((current) =>
                                value
                                  ? [...new Set([...current, header])]
                                  : current.filter((h) => h !== header),
                              )
                            }
                            aria-label={`Revisé ${header}`}
                          />
                          <span>Revisé</span>
                        </label>
                      ) : (
                        '✓'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!mappingValid && (
            <p className="gx-note mt-4" role="alert">
              Incluí caravana y fecha de nacimiento. Cada destino se usa una
              sola vez.
            </p>
          )}
          {proposal.warnings.length > 0 && (
            <ul className="gx-note mt-3 list-disc pl-4">
              {proposal.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <p className="gx-note my-5">
            Confirmar reemplaza el rodeo activo. Se reinician su clasificación y
            plan para trabajar con los datos nuevos.
          </p>
          <div className="flex justify-between gap-3">
            <Button
              variant="ghost"
              disabled={confirm.isPending}
              onClick={() => {
                setProposal(null);
                setReviewed([]);
                upload.reset();
              }}
            >
              Otro archivo
            </Button>
            <Button
              disabled={
                !mappingValid ||
                low.some((h) => !reviewed.includes(h)) ||
                confirm.isPending
              }
              onClick={() =>
                confirm.mutate({
                  importId,
                  mapping: {
                    headerRow: proposal.headerRow,
                    columns: proposal.columns,
                  } satisfies ColumnMapping,
                })
              }
            >
              {confirm.isPending ? 'Guardando rodeo…' : 'Darles vida'}
              <ArrowRight />
            </Button>
          </div>
        </section>
      )}
      {confirm.data && (
        <section className="gx-import-success gx-panel">
          <h2>Ya tienen su lugar.</h2>
          <p>
            {confirm.data.rowsOk} filas importadas. Ahora podés clasificar el
            rodeo y descubrir los candidatos de cada vaca.
          </p>
          {confirm.data.rowsRejected.length > 0 && (
            <details>
              <summary>
                {confirm.data.rowsRejected.length} filas rechazadas
              </summary>
              <ul className="gx-note">
                {confirm.data.rowsRejected.map((r) => (
                  <li key={r.row}>
                    Fila {r.row}: {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {confirm.data.warnings.length > 0 && (
            <details className="my-4">
              <summary>
                {confirm.data.warnings.length} avisos de importación
              </summary>
              <ul className="gx-note">
                {confirm.data.warnings.map((w, i) => (
                  <li key={`${i}:${w}`}>{w}</li>
                ))}
              </ul>
            </details>
          )}
          <Button asChild>
            <Link to="/motor-genetico/tablero">
              Entrar al rodeo <ArrowRight />
            </Link>
          </Button>
        </section>
      )}
    </section>
  );
}
