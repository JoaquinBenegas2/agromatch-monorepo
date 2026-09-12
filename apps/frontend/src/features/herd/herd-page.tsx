import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dna } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiClientError } from '../../shared/api/client.js';
import { useClassificationSummary, useClassifyHerd, useFemales } from '../../shared/api/hooks/use-herd.js';
import { UploadHerdButton } from '../herd-import/herd-import-page.js';

const goal = { preset: 'BALANCED' as const, weights: {}, wantBetaA2: false, wantKappaBB: false };

const TIER_BADGE: Record<string, BadgeProps['variant']> = {
  ELITE: 'ok',
  COMMERCIAL: 'neutral',
  BEEF: 'warn',
  CULL_ALERT: 'danger',
};

export function HerdPage({ farmId }: { farmId: string }) {
  const females = useFemales(farmId);
  const summary = useClassificationSummary(farmId);
  const classify = useClassifyHerd(farmId);
  const navigate = useNavigate();
  const [tag, setTag] = useState('');

  if (females.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (females.error) return <ErrorMessage message={(females.error as Error).message} />;

  if (!females.data?.length) {
    return (
      <EmptyState
        icon={<Dna />}
        title="Aún no cargaste hembras"
        description="Subí el Excel del rodeo para clasificarlo y empezar a matchear."
        action={<UploadHerdButton />}
      />
    );
  }

  const unclassified =
    summary.error instanceof ApiClientError && summary.error.code === 'HERD_NOT_CLASSIFIED';
  const filtered = females.data.filter(
    (female) => !tag || female.classification?.tags.includes(tag as never),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tablero del rodeo"
        description={`${females.data.length} hembras cargadas`}
        actions={
          <Button variant="secondary" onClick={() => void classify.mutateAsync(goal)} disabled={classify.isPending}>
            {classify.isPending ? 'Clasificando…' : unclassified ? 'Clasificar' : 'Reclasificar'}
          </Button>
        }
      />

      {unclassified && (
        <EmptyState icon={<Dna />} title="El rodeo todavía no fue clasificado" description="Corré la clasificación para ver el tablero por tier." />
      )}

      {summary.error && !unclassified && <ErrorMessage message={(summary.error as Error).message} />}

      {summary.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(summary.data.byTier).map(([tier, total]) => (
              <StatCard
                key={tier}
                label={tier.replace('_', ' ')}
                value={String(total)}
                meta={<Badge variant={TIER_BADGE[tier] ?? 'neutral'}>{tier.replace('_', ' ')}</Badge>}
              />
            ))}
          </div>
          <p className="text-[11.5px] text-muted-foreground">
            Con las reglas clásicas,{' '}
            <span className="font-semibold text-foreground">
              {summary.data.classicRulesBeefCount} (
              {Math.round((summary.data.classicRulesBeefCount * 100) / summary.data.total)}%)
            </span>{' '}
            iban a carne.
          </p>
        </>
      )}

      <Card className="p-4">
        <Input
          aria-label="Filtrar por tag"
          placeholder="Filtrar por tag…"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          className="mb-3 max-w-xs"
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID visual</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((female) => (
              <TableRow
                key={female.id}
                onClick={() => navigate(`/motor-genetico/matching/${female.id}`)}
                className="cursor-pointer hover:bg-muted"
              >
                <TableCell className="font-semibold">{female.visualId}</TableCell>
                <TableCell>
                  {female.classification ? (
                    <Badge variant={TIER_BADGE[female.classification.tier] ?? 'neutral'}>
                      {female.classification.tier.replace('_', ' ')}
                    </Badge>
                  ) : (
                    <span className="text-ink-4">Sin perfil</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {female.classification?.reasons.join('; ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
