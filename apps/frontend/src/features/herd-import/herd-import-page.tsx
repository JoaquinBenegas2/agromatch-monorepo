import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, UploadCloud } from 'lucide-react';
import type { ColumnMapping, MappingProposal } from '@org/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirmHerd, useUploadHerd } from '../../shared/api/hooks/use-herd.js';

export function UploadHerdButton() {
  const navigate = useNavigate();
  return (
    <Button variant="secondary" onClick={() => navigate('/motor-genetico/importar')}>
      Subir Excel
    </Button>
  );
}

export function HerdImportPage({ farmId }: { farmId: string }) {
  const upload = useUploadHerd(farmId);
  const confirm = useConfirmHerd(farmId);
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<MappingProposal | null>(null);
  const [importId, setImportId] = useState('');
  const [reviewed, setReviewed] = useState<string[]>([]);

  const low = Object.entries(proposal?.confidence ?? {})
    .filter(([, value]) => value < 0.8)
    .map(([header]) => header);

  const submit = async (file: File) => {
    const result = await upload.mutateAsync(file);
    setProposal(result.proposal);
    setImportId(result.importId);
  };

  if (confirm.data) {
    return (
      <EmptyState
        icon={<CheckCircle2 />}
        title="Rodeo importado"
        description={`${confirm.data.rowsOk} filas importadas.`}
        action={<Button onClick={() => navigate('/motor-genetico/tablero')}>Ir al tablero</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Carga del rodeo" description="Subí el Excel de tu rodeo para clasificarlo." />

      <Card
        role="button"
        tabIndex={0}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file && /\.xlsx?$/i.test(file.name)) void submit(file);
        }}
        className="flex flex-col items-center gap-3 border-dashed p-10 text-center"
      >
        <UploadCloud className="size-8 text-ink-4" />
        <p className="text-[13.5px]">Soltá aquí tu Excel o elegilo desde tu equipo.</p>
        <input
          aria-label="Archivo Excel"
          type="file"
          accept=".xls,.xlsx"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void submit(file);
          }}
          className="text-[11.5px] text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-[12.5px] file:font-semibold file:text-primary-foreground"
        />
      </Card>

      {(upload.error || confirm.error) && (
        <ErrorMessage message={((upload.error ?? confirm.error) as Error).message} />
      )}

      {proposal && (
        <Card className="p-4">
          <h2 className="mb-3 text-[15.5px] font-semibold tracking-[-0.01em]">Revisá el mapeo</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Columna</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead className="num">Confianza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(proposal.columns).map(([header, target]) => {
                const confidence = proposal.confidence[header];
                const isLow = confidence !== undefined && confidence < 0.8;
                return (
                  <TableRow key={header}>
                    <TableCell className="font-semibold">{header}</TableCell>
                    <TableCell>
                      <select
                        value={target}
                        onChange={() => setReviewed((current) => [...new Set([...current, header])])}
                        className="rounded-sm border border-input bg-card px-2 py-1.5 text-[12.5px] text-foreground outline-none"
                      >
                        <option>{target}</option>
                      </select>
                    </TableCell>
                    <TableCell className="num">
                      <Badge variant={isLow ? 'warn' : 'ok'}>{confidence?.toFixed(2)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Button
            className="mt-4"
            disabled={low.some((header) => !reviewed.includes(header)) || confirm.isPending}
            onClick={() =>
              void confirm.mutateAsync({
                importId,
                mapping: { headerRow: proposal.headerRow, columns: proposal.columns } as ColumnMapping,
              })
            }
          >
            Confirmar
          </Button>
        </Card>
      )}
    </div>
  );
}
