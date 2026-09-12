import { useState } from 'react';
import { ClipboardList, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getActiveUserId, useActiveFarmId } from '../../shared/user/user-context.js';
import { useBulls } from '../../shared/api/hooks/use-bulls.js';
import { useAutoPlan, useRemovePlanItem } from '../../shared/api/hooks/use-plan-item-mutations.js';
import { usePlan } from '../../shared/api/hooks/use-plan.js';

const BALANCED_GOAL = {
  preset: 'BALANCED' as const,
  weights: {},
  wantBetaA2: false,
  wantKappaBB: false,
};

const SEMEN_LABEL: Record<string, string> = {
  SEXED: 'Sexado',
  CONVENTIONAL: 'Convencional',
  BEEF: 'Carne',
};

/**
 * D5 (REQ-D-14): tab "Plan de servicios" de `/negociacion/plan`. `PlanItem`
 * solo guarda el id interno de la hembra (mvp-c-herd todavía no publica
 * `GET /farms/:farmId/females`, así que no hay `visualId`/`tier` para unir
 * acá) — se muestra ese id como identificador de la hembra hasta que exista
 * ese endpoint; el CSV (REQ-D-13) sí los resuelve porque el backend habla
 * directo con `FemaleRepo`/`ClassificationRepo`.
 */
export function PlanScreen() {
  const [farmId] = useActiveFarmId();
  const navigate = useNavigate();
  const { data: plan, isLoading, isError, error } = usePlan(farmId);
  const { data: bulls } = useBulls();
  const removeItem = useRemovePlanItem(farmId);
  const autoPlan = useAutoPlan(farmId);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const bullsByNaab = new Map((bulls ?? []).map((b) => [b.naab, b]));

  const exportUrl = farmId ? `/api/farms/${farmId}/plan/export.csv` : undefined;

  async function handleExport() {
    if (!exportUrl) return;
    const response = await fetch(exportUrl, { headers: { 'x-user-id': getActiveUserId() } });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plan-${farmId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleRemove(femaleId: string) {
    setRemovingId(femaleId);
    try {
      await removeItem.mutateAsync(femaleId);
    } finally {
      setRemovingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage message={(error as Error).message} />;
  }

  if (!plan || plan.items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Plan de servicios" description="Todavía no hay ítems en el plan." />
        <EmptyState
          icon={<ClipboardList />}
          title="El plan está vacío"
          description='Usá "Plan automático" para completarlo con el mejor toro para cada hembra, o elegí toros desde el Matching genético.'
          action={
            <div className="flex items-center gap-2">
              <Button onClick={() => autoPlan.mutate(BALANCED_GOAL)} disabled={autoPlan.isPending}>
                {autoPlan.isPending ? 'Generando...' : 'Plan automático'}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/motor-genetico/matching')}>
                Ir al Matching genético
              </Button>
            </div>
          }
        />
        {autoPlan.isError && <ErrorMessage message={(autoPlan.error as Error).message} />}
      </div>
    );
  }

  const avgProgeny = plan.totals.avgExpectedProgeny;
  const avgCi = avgProgeny.ci != null ? avgProgeny.ci.toFixed(0) : '—';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Plan de servicios"
        description={`${plan.items.length} hembra${plan.items.length === 1 ? '' : 's'} con toro asignado.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => autoPlan.mutate(BALANCED_GOAL)} disabled={autoPlan.isPending}>
              {autoPlan.isPending ? 'Generando...' : 'Plan automático'}
            </Button>
            <Button variant="ghost" onClick={handleExport}>
              Exportar CSV
            </Button>
          </>
        }
      />

      {autoPlan.isError && <ErrorMessage message={(autoPlan.error as Error).message} />}
      {removeItem.isError && <ErrorMessage message={(removeItem.error as Error).message} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Dosis sexado" value={plan.totals.doses.SEXED} />
        <StatCard label="Dosis convencional" value={plan.totals.doses.CONVENTIONAL} />
        <StatCard label="Dosis carne" value={plan.totals.doses.BEEF} />
        <StatCard label="Costo total" value={`US$ ${plan.totals.cost}`} meta={`CI prom. cría: ${avgCi}`} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hembra</TableHead>
            <TableHead>Toro</TableHead>
            <TableHead>Central</TableHead>
            <TableHead>Tipo de semen</TableHead>
            <TableHead className="num">Compatibilidad</TableHead>
            <TableHead className="num">Precio</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.items.map((item) => {
            const bull = bullsByNaab.get(item.bullNaab);
            return (
              <TableRow
                key={item.femaleId}
                className="cursor-pointer"
                onClick={() => navigate(`/motor-genetico/matching/${item.femaleId}`)}
              >
                <TableCell className="font-mono">{item.femaleId}</TableCell>
                <TableCell>{bull?.name ?? item.bullNaab}</TableCell>
                <TableCell className="text-muted-foreground">{bull?.company ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="neutral">{SEMEN_LABEL[item.semenType] ?? item.semenType}</Badge>
                </TableCell>
                <TableCell className="num">{item.compatibility}</TableCell>
                <TableCell className="num">
                  {item.pricePerDose != null ? `US$ ${item.pricePerDose}` : 'sin precio'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={removingId === item.femaleId}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRemove(item.femaleId);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
