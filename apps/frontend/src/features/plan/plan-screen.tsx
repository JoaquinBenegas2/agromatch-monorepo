import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SpatialLabel, SpatialScene } from '@/components/spatial/spatial-scene';
import { getActiveUserId, useActiveFarmId } from '../../shared/user/user-context.js';
import { useBulls } from '../../shared/api/hooks/use-bulls.js';
import { useFemales } from '../../shared/api/hooks/use-herd.js';
import { useAutoPlan, useRemovePlanItem } from '../../shared/api/hooks/use-plan-item-mutations.js';
import { usePlan } from '../../shared/api/hooks/use-plan.js';
import { GeneticsHeading, useGeneticsMotion } from '../genetics/genetics-experience';

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

const TIER_LABEL: Record<string, string> = {
  ELITE: 'Élite',
  COMMERCIAL: 'Comercial',
  BEEF: 'Carne',
  CULL_ALERT: 'Alerta de descarte',
};

/**
 * D5 (REQ-D-14): "Plan de servicios" de Motor genético (`/motor-genetico/plan`).
 * `PlanItem` solo guarda el id interno de la hembra: la caravana (`visualId`)
 * y el tier se unen acá con `GET /farms/:farmId/females` (mvp-c-herd).
 */
export function PlanScreen() {
  const [activeFarmId] = useActiveFarmId();
  const farmId = activeFarmId ?? '';
  const navigate = useNavigate();
  const { data: plan, isLoading, isError, error } = usePlan(activeFarmId);
  const { data: bulls } = useBulls();
  const { data: females } = useFemales(farmId);
  const removeItem = useRemovePlanItem(farmId);
  const autoPlan = useAutoPlan(farmId);
  const { still } = useGeneticsMotion();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const bullsByNaab = new Map((bulls ?? []).map((b) => [b.naab, b]));
  const femalesById = new Map((females ?? []).map((f) => [f.id, f]));

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
      <section className="gx-view gx-plan" aria-label="Cargando plan de servicios">
        <div className="gx-state">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="gx-view gx-plan">
        <div className="gx-state">
          <ErrorMessage message={(error as Error).message} />
        </div>
      </section>
    );
  }

  if (!plan || plan.items.length === 0) {
    return (
      <section className="gx-view gx-plan" aria-label="Plan de servicios">
        <GeneticsHeading
          index="04"
          eyebrow="PLAN / DEL ENCUENTRO A LA ACCIÓN"
          title="Todavía no hay"
          accent="ningún encuentro guardado."
          description='Guardá un encuentro desde el matching genético, o generá un plan automático con el mejor toro para cada hembra del rodeo.'
        >
          <div className="gx-herd-actions">
            <Button onClick={() => autoPlan.mutate(BALANCED_GOAL)} disabled={autoPlan.isPending}>
              {autoPlan.isPending ? 'Generando…' : 'Plan automático'}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/motor-genetico/matching')}>
              Ir al matching genético
            </Button>
          </div>
          {autoPlan.isError && (
            <ErrorMessage className="mt-4" message={(autoPlan.error as Error).message} />
          )}
        </GeneticsHeading>
      </section>
    );
  }

  const avgProgeny = plan.totals.avgExpectedProgeny;
  const avgCi = avgProgeny.ci != null ? avgProgeny.ci.toFixed(0) : '—';
  const documents = Math.min(4, Math.max(1, Math.ceil(plan.items.length / 60)));

  return (
    <section className="gx-view gx-plan" aria-label="Plan de servicios">
      <div className="gx-plan-top">
        <GeneticsHeading
          index="04"
          eyebrow="PLAN / DEL ENCUENTRO A LA ACCIÓN"
          title={String(plan.items.length)}
          accent={plan.items.length === 1 ? 'encuentro guardado.' : 'encuentros guardados.'}
          description="Cada fila es una vaca con el toro que le asignaste. La compatibilidad y el costo salen del mismo motor que viste en el matching genético."
        >
          <div className="gx-herd-actions">
            <Button variant="secondary" onClick={() => autoPlan.mutate(BALANCED_GOAL)} disabled={autoPlan.isPending}>
              {autoPlan.isPending ? 'Generando…' : 'Plan automático'}
            </Button>
            <Button variant="ghost" onClick={handleExport}>
              Exportar CSV
            </Button>
          </div>
          {autoPlan.isError && (
            <ErrorMessage className="mt-3" message={(autoPlan.error as Error).message} />
          )}
          {removeItem.isError && (
            <ErrorMessage className="mt-3" message={(removeItem.error as Error).message} />
          )}
        </GeneticsHeading>

        <SpatialScene
          kind="plan"
          className="gx-plan-world"
          options={{ count: () => documents, reduced: () => still, paused: () => still }}
        >
          <SpatialLabel anchor="document">
            {plan.items.length} {plan.items.length === 1 ? 'encuentro guardado' : 'encuentros guardados'}
          </SpatialLabel>
        </SpatialScene>
      </div>

      <div className="gx-plan-stats">
        <StatCard label="Dosis sexado" value={plan.totals.doses.SEXED} />
        <StatCard label="Dosis convencional" value={plan.totals.doses.CONVENTIONAL} />
        <StatCard label="Dosis carne" value={plan.totals.doses.BEEF} />
        <StatCard label="Costo total" value={`US$ ${plan.totals.cost}`} meta={`CI prom. cría: ${avgCi}`} />
      </div>

      <div className="gx-plan-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hembra</TableHead>
              <TableHead>Tier</TableHead>
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
              const female = femalesById.get(item.femaleId);
              const tier = female?.classification?.tier;
              return (
                <TableRow
                  key={item.femaleId}
                  className="cursor-pointer"
                  onClick={() => navigate(`/motor-genetico/matching/${item.femaleId}`)}
                >
                  <TableCell>{female?.visualId ?? item.femaleId}</TableCell>
                  <TableCell>
                    {tier ? <Badge variant="neutral">{TIER_LABEL[tier] ?? tier}</Badge> : '—'}
                  </TableCell>
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
    </section>
  );
}
