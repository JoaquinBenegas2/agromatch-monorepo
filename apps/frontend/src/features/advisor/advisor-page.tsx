import type { Farm, FarmSummary, Tier, TraitKey } from '@org/shared-types';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useAdvisorOverview } from './advisor.api.js';

const TIERS: Tier[] = ['ELITE', 'COMMERCIAL', 'BEEF', 'CULL_ALERT'];
const TIER_LABELS: Record<Tier, string> = {
  ELITE: 'Élite',
  COMMERCIAL: 'Comercial',
  BEEF: 'Carne',
  CULL_ALERT: 'Alerta de descarte',
};

const TRAIT_ORDER: TraitKey[] = ['milk', 'fat', 'pro', 'ci', 'pl', 'scs', 'fs', 'rfi'];
const TRAIT_LABELS: Record<TraitKey, string> = {
  milk: 'Leche',
  fat: 'Grasa',
  pro: 'Proteína',
  ci: 'CI',
  pl: 'PL',
  scs: 'SCS',
  fs: 'FS',
  rfi: 'RFI',
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function LoadingState() {
  return (
    <div className="grid gap-3 p-6 md:grid-cols-3" aria-label="Cargando panel del asesor">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-72 w-full" />
      ))}
    </div>
  );
}

function FarmCard({ summary }: { summary: FarmSummary }) {
  const classified = TIERS.some((tier) => summary.byTier[tier] > 0);
  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-[15px] font-bold tracking-tight">{summary.farm.name}</p>
        <p className="text-[11.5px] text-muted-foreground">{summary.farm.location}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Hembras con perfil" value={summary.total} />
        <StatCard label="A2/A2" value={pct(summary.a2a2Share)} />
        <StatCard label="Kappa BB" value={pct(summary.bbShare)} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Distribución por tier
        </p>
        {TIERS.map((tier) => {
          const count = summary.byTier[tier];
          const share = summary.total > 0 ? (count / summary.total) * 100 : 0;
          return (
            <div key={tier} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-[11px] text-muted-foreground">{TIER_LABELS[tier]}</span>
              <Progress value={share} className="flex-1" />
              <span className="w-8 shrink-0 text-right font-mono text-[11px]">{count}</span>
            </div>
          );
        })}
        {!classified ? (
          <p className="text-[11px] text-muted-foreground">Todavía no se clasificó este rodeo.</p>
        ) : null}
      </div>
    </Card>
  );
}

function traitPercent(value: number, min: number, max: number): number {
  if (max <= min) return 100;
  return ((value - min) / (max - min)) * 100;
}

function TraitsComparison({ summaries }: { summaries: FarmSummary[] }) {
  const keys = TRAIT_ORDER.filter((key) => summaries.some((summary) => summary.avgTraits[key] !== undefined));
  if (keys.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <p className="text-[13px] font-bold tracking-tight">Comparación de rasgos promedio</p>
      <div className="flex flex-col gap-4">
        {keys.map((key) => {
          const values = summaries
            .map((summary) => ({ farm: summary.farm, value: summary.avgTraits[key] }))
            .filter((entry): entry is { farm: Farm; value: number } => entry.value !== undefined);
          const min = Math.min(...values.map((entry) => entry.value));
          const max = Math.max(...values.map((entry) => entry.value));
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {TRAIT_LABELS[key]}
              </p>
              {values.map(({ farm, value }) => (
                <div key={farm.id} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 truncate text-[11px] text-muted-foreground">{farm.name}</span>
                  <Progress value={traitPercent(value, min, max)} className="flex-1" />
                  <span className="w-14 shrink-0 text-right font-mono text-[11px]">{value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** REQ-B-ADV-02: una `Card` por tambo con distribución por tier, A2/A2, BB y comparación de `avgTraits`. */
export function AdvisorPage() {
  const { data, isLoading, isError, error } = useAdvisorOverview();

  if (isLoading) return <LoadingState />;

  if (isError) {
    return (
      <div className="p-6">
        <ErrorMessage message={(error as Error).message} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Users />}
          title="Todavía no hay tambos asignados a tu cuenta"
          description="Cuando se asignen establecimientos, vas a ver su resumen genético acá."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid gap-3 md:grid-cols-3">
        {data.map((summary) => (
          <FarmCard key={summary.farm.id} summary={summary} />
        ))}
      </div>
      <TraitsComparison summaries={data} />
    </div>
  );
}
