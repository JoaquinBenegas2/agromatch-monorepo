import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { BreedingGoal, ExplanationFacts, MatchCandidate } from '@org/shared-types';
import { TRAIT_DIRECTION } from '@org/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ComparisonBar } from '@/components/ui/comparison-bar';
import { AiExplanation } from '@/components/ui/ai-explanation';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useExplanation, usePrefetchExplanation } from '../../shared/api/hooks/use-explanation.js';

const TRAIT_LABEL: Record<string, string> = {
  ci: 'CI',
  milk: 'Litros',
  fat: 'Grasa',
  pro: 'Proteína',
  pl: 'PL',
  scs: 'SCS',
  fs: 'FS',
  rfi: 'RFI',
};

interface MatchRowProps {
  candidate: MatchCandidate;
  farmId: string;
  femaleId: string;
  goal: BreedingGoal;
  defaultExpanded?: boolean;
  onChoose: (candidate: MatchCandidate) => void;
  inPlan: boolean;
  choosing: boolean;
  /** Siguiente candidato, para el prefetch al expandir (Q4). */
  next?: MatchCandidate;
  /** Proyecta este candidato en la escena de arriba, sin comprometerlo al plan. */
  onPreview?: (candidate: MatchCandidate) => void;
  previewing?: boolean;
}

export function MatchRow({
  candidate,
  farmId,
  femaleId,
  goal,
  defaultExpanded,
  onChoose,
  inPlan,
  choosing,
  next,
  onPreview,
  previewing,
}: MatchRowProps) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));
  const facts = candidate.verticalFacts as ExplanationFacts | undefined;
  const prefetch = usePrefetchExplanation();

  const explanation = useExplanation(farmId, femaleId, candidate.capabilityId, goal, expanded);

  function toggle() {
    const next2 = !expanded;
    setExpanded(next2);
    if (next2 && next) {
      void prefetch(farmId, femaleId, next.capabilityId, goal);
    }
  }

  return (
    <Card className={cn('overflow-hidden', expanded && 'border-primary')}>
      <div className="flex items-center gap-4 p-3.5">
        <div className="flex size-[52px] shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <span role="img" aria-label="Toro">
            🐂
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15.5px] font-bold tracking-tight">{facts?.bull.name ?? candidate.capabilityId}</p>
          <p className="truncate text-[11.5px] text-muted-foreground">
            {facts?.bull.company} · {facts?.bull.breed} · {facts?.semenType}
            {candidate.fit.price != null && ' · '}
          </p>
        </div>
        {/* REQ-D-06: ranking, nunca un porcentaje suelto. */}
        <Badge variant="solid" className="shrink-0 font-mono">
          #{candidate.rank} de {facts?.totalCandidates ?? '—'} · {candidate.compatibility}
        </Badge>
        <Button variant="ghost" size="sm" onClick={toggle} className="shrink-0">
          Ver detalle
          <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
        </Button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 border-t border-border-soft p-3.5 pt-3.5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[9.5px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
              Por qué matchea · cría esperada
            </span>
            {facts?.expectedProgeny &&
              facts.damTraits &&
              (Object.keys(facts.expectedProgeny) as (keyof typeof facts.expectedProgeny)[]).map((key) => {
                const from = facts.damTraits?.[key];
                const to = facts.expectedProgeny?.[key];
                if (from == null || to == null) return null;
                const direction = TRAIT_DIRECTION[key] === -1 ? 'lower-is-better' : 'higher-is-better';
                const spread = Math.max(Math.abs(from), Math.abs(to), 1) * 1.4;
                return (
                  <ComparisonBar
                    key={key}
                    label={TRAIT_LABEL[key] ?? key}
                    from={from}
                    to={to}
                    min={-spread}
                    max={spread}
                    direction={direction}
                    format={(v) => v.toFixed(2)}
                  />
                );
              })}
            <p className="text-[11.5px] text-muted-foreground">
              A2/A2: {facts?.caseinOdds.betaA2A2 != null ? `${facts.caseinOdds.betaA2A2}%` : 'sin dato'} · BB:{' '}
              {facts?.caseinOdds.kappaBB != null ? `${facts.caseinOdds.kappaBB}%` : 'sin dato'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(facts?.filters ?? [])
                .filter((f) => f.passed)
                .map((f) => (
                  <Badge key={f.rule} variant="ok">
                    {f.detail}
                  </Badge>
                ))}
            </div>
            {explanation.isPending && <Skeleton className="h-16 w-full" />}
            {explanation.isError && <ErrorMessage message={(explanation.error as Error).message} />}
            {explanation.data && <AiExplanation text={explanation.data.text} source={explanation.data.source} />}
          </div>

          <div className="flex flex-col gap-3">
            <span className="font-mono text-[9.5px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
              Madre vs toro
            </span>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carácter</TableHead>
                  <TableHead className="text-right">Madre</TableHead>
                  <TableHead className="text-right">Toro</TableHead>
                  <TableHead className="text-right">Cría esperada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facts?.damTraits &&
                  facts.expectedProgeny &&
                  (Object.keys(facts.expectedProgeny) as (keyof typeof facts.expectedProgeny)[]).map((key) => {
                    const dam = facts.damTraits?.[key];
                    const expected = facts.expectedProgeny?.[key];
                    if (dam == null || expected == null) return null;
                    return (
                      <TableRow key={key}>
                        <TableCell>{TRAIT_LABEL[key] ?? key}</TableCell>
                        <TableCell className="text-right font-mono">{dam.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">—</TableCell>
                        <TableCell className="text-right font-mono">{expected.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2 md:col-span-2">
            {onPreview && (
              <Button
                variant={previewing ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => onPreview(candidate)}
              >
                {previewing ? 'Repetir escena' : 'Proyectar cría'}
              </Button>
            )}
            {inPlan ? (
              <>
                <Badge variant="ok">En el plan</Badge>
                <Button variant="ghost" size="sm" onClick={() => onChoose(candidate)} disabled={choosing}>
                  Quitar del plan
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => onChoose(candidate)} disabled={choosing}>
                Elegir para el plan
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
