import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Compass, Dna } from 'lucide-react';
import type { BreedingGoal, ExplanationFacts, GoalPreset, MatchCandidate } from '@org/shared-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { SpatialLabel, SpatialScene } from '@/components/spatial/spatial-scene';
import { cn } from '@/lib/utils';
import { useActiveFarmId } from '../../shared/user/user-context.js';
import { useMatchBoard } from '../../shared/api/hooks/use-match-board.js';
import { useAddPlanItem, useRemovePlanItem } from '../../shared/api/hooks/use-plan-item-mutations.js';
import { useFemales } from '../../shared/api/hooks/use-herd.js';
import { usePlan } from '../../shared/api/hooks/use-plan.js';
import { MatchRow } from './match-row.js';

/**
 * Anima 0→1 (o 1→0) en ~1.2s; se lee por ref en cada frame, sin re-render.
 * `replayKey` fuerza que la animación arranque de nuevo aunque `active` no
 * cambie (para "Repetir escena" sobre el mismo candidato).
 */
function useRevealProgress(active: boolean, replayKey: number) {
  const progressRef = useRef(active ? 1 : 0);
  useEffect(() => {
    const from = active ? 0 : progressRef.current;
    const target = active ? 1 : 0;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      progressRef.current = from + (target - from) * t;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- replayKey es el disparador intencional
  }, [active, replayKey]);
  return progressRef;
}

const PRESETS: { id: GoalPreset; label: string }[] = [
  { id: 'BALANCED', label: 'Balanceado' },
  { id: 'SOLIDS_CHEESE', label: 'Más sólidos (quesera)' },
  { id: 'A2_MILK', label: 'Leche A2' },
  { id: 'VOLUME', label: 'Volumen' },
  { id: 'HEALTH_LONGEVITY', label: 'Salud y longevidad' },
  { id: 'EFFICIENCY', label: 'Eficiencia (RFI)' },
];

function presetGoal(preset: GoalPreset): BreedingGoal {
  return { preset, weights: {}, wantBetaA2: preset === 'A2_MILK', wantKappaBB: false };
}

/** El home del mercado (M6) deriva una necesidad GENETICS acá con su objetivo ya interpretado. */
function isBreedingGoal(value: unknown): value is BreedingGoal {
  return (
    typeof value === 'object' &&
    value !== null &&
    'preset' in value &&
    'weights' in value &&
    typeof (value as { weights: unknown }).weights === 'object'
  );
}

export function MatchingScreen() {
  const { femaleId } = useParams<{ femaleId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeFarmId] = useActiveFarmId();
  const farmId = activeFarmId ?? '';
  const incomingGoal = isBreedingGoal((location.state as { goal?: unknown } | null)?.goal)
    ? (location.state as { goal: BreedingGoal }).goal
    : null;
  const [preset, setPreset] = useState<GoalPreset>(
    incomingGoal && incomingGoal.preset !== 'CUSTOM' ? incomingGoal.preset : 'BALANCED',
  );
  const [goal, setGoal] = useState<BreedingGoal>(incomingGoal ?? presetGoal('BALANCED'));
  // Proyección de la cría bajo demanda ("Proyectar cría"): independiente de
  // agregar el candidato al plan, como en la escena de referencia.
  const [previewNaab, setPreviewNaab] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const females = useFemales(farmId);
  const board = useMatchBoard(farmId, femaleId, goal);
  const addItem = useAddPlanItem(farmId);
  const removeItem = useRemovePlanItem(farmId);
  // REQ-D-14: el toro "En el plan" sale del plan real (B5), no de un estado
  // local — así al entrar desde /negociacion/plan ya viene marcado.
  const plan = usePlan(activeFarmId);
  const chosenNaab = plan.data?.items.find((item) => item.femaleId === femaleId)?.bullNaab ?? null;
  const projectedNaab = previewNaab ?? chosenNaab;
  const revealRef = useRevealProgress(Boolean(projectedNaab), previewKey);

  // Sin hembra en la URL: entramos directo con la primera del rodeo en vez
  // de mostrar un buscador por ID.
  useEffect(() => {
    if (!femaleId && females.data && females.data.length > 0) {
      navigate(`/motor-genetico/matching/${females.data[0].id}`, { replace: true });
    }
  }, [femaleId, females.data, navigate]);

  function handlePreview(candidate: MatchCandidate) {
    setPreviewNaab(candidate.capabilityId);
    setPreviewKey((key) => key + 1);
  }

  useEffect(() => {
    setPreviewNaab(null);
  }, [femaleId]);

  function handleChoose(candidate: MatchCandidate) {
    if (!femaleId) return;
    if (chosenNaab === candidate.capabilityId) {
      removeItem.mutate(femaleId);
      return;
    }
    const facts = candidate.verticalFacts as { semenType?: string } | undefined;
    // El precio lo completa el backend desde el catálogo (los hechos no lo traen).
    addItem.mutate({
      femaleId,
      bullNaab: candidate.capabilityId,
      semenType: (facts?.semenType as never) ?? 'CONVENTIONAL',
      compatibility: candidate.compatibility,
      pricePerDose: null,
    });
  }

  const planError = addItem.error ?? removeItem.error;

  const ranked = board.data?.ranked ?? [];
  const excluded = board.data?.excluded ?? [];
  const sceneCandidate = ranked.find((c) => c.capabilityId === projectedNaab) ?? ranked[0];
  const sceneBullName =
    (sceneCandidate?.verticalFacts as ExplanationFacts | undefined)?.bull.name ??
    sceneCandidate?.capabilityId;
  const currentFemale = females.data?.find((f) => f.id === femaleId);

  const header = (
    <PageHeader
      title={
        <>
          El futuro se <span className="font-serif text-primary italic">diseña.</span>
        </>
      }
      description="Una vaca. Un aporte. Explorá lo que podría cambiar en la próxima generación."
      actions={
        females.data && females.data.length > 0 ? (
          <Select value={femaleId} onValueChange={(id) => navigate(`/motor-genetico/matching/${id}`)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Elegir hembra" />
            </SelectTrigger>
            <SelectContent>
              {females.data.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.visualId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : undefined
      }
    />
  );

  const goalPills = (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => {
            setPreset(p.id);
            setGoal(presetGoal(p.id));
          }}
          className={cn(
            'rounded-full border px-3.5 py-2 text-[11.5px] font-medium transition-colors',
            preset === p.id
              ? 'border-secondary-border bg-accent font-semibold text-primary'
              : 'border-border text-muted-foreground hover:bg-muted',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  if (females.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!femaleId) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <EmptyState
          icon={<Dna />}
          title="Todavía no cargaste tu rodeo"
          description="Subí el Excel del rodeo para elegir una hembra y ver sus candidatos."
          action={
            <Button asChild>
              <Link to="/motor-genetico/importar">Subir Excel</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header}
      {goalPills}

      {ranked.length > 0 && (
        <>
          <SpatialScene
            kind="genetic"
            className="h-[280px] w-full rounded-lg border border-border bg-[radial-gradient(ellipse_at_48%_15%,#38664d_0%,#164737_48%,#103c31_100%)]"
            options={{
              progress: () => revealRef.current,
              projected: () => true,
            }}
          >
            <SpatialLabel anchor="mother" className="-translate-x-1/2">
              <span className="block text-[8px] font-semibold tracking-[0.1em] text-[#c6d5b4] uppercase">
                Tu hembra
              </span>
              <strong className="block text-[15px] font-medium text-[#f0f5dc]">
                {currentFemale?.visualId ?? femaleId}
              </strong>
            </SpatialLabel>
            <SpatialLabel anchor="bull" className="-translate-x-1/2">
              <span className="block text-[8px] font-semibold tracking-[0.1em] text-[#c6d5b4] uppercase">
                {chosenNaab === sceneCandidate?.capabilityId
                  ? 'Toro elegido'
                  : previewNaab
                    ? 'Proyectando'
                    : 'Toro mejor rankeado'}
              </span>
              <strong className="block text-[15px] font-medium text-[#f0f5dc]">{sceneBullName}</strong>
            </SpatialLabel>
            <SpatialLabel anchor="calf" className="-translate-x-1/2">
              <span className="block text-[8px] font-semibold tracking-[0.1em] text-lime uppercase">Cría proyectada</span>
            </SpatialLabel>
            <span className="pointer-events-none absolute bottom-2 right-3 z-[2] text-[9px] text-[#b5ceb1]">
              Representación conceptual. No predice sexo, pelaje ni resultado reproductivo.
            </span>
          </SpatialScene>

          {sceneCandidate && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-3.5">
              <p className="max-w-[440px] text-[11.5px] text-muted-foreground">
                La escena conecta a <span className="font-semibold text-foreground">{currentFemale?.visualId ?? femaleId}</span>{' '}
                con el aporte de <span className="font-semibold text-foreground">{sceneBullName}</span>. Compará el
                escenario antes de llevarlo al plan.
              </p>
              <Button onClick={() => handlePreview(sceneCandidate)}>
                {projectedNaab === sceneCandidate.capabilityId ? 'Repetir escena' : 'Proyectar cría'}
              </Button>
            </div>
          )}
        </>
      )}

      {board.isPending && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {board.isError && <ErrorMessage message={(board.error as Error).message} />}
      {planError && <ErrorMessage message={(planError as Error).message} />}

      {board.isSuccess && ranked.length === 0 && excluded.length === 0 && (
        <EmptyState icon={<Compass />} title="Sin candidatos" description="No hay toros evaluados todavía para esta hembra." />
      )}

      {board.isSuccess && ranked.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] font-semibold">Toros compatibles</span>
            <span className="text-[11.5px] text-muted-foreground">
              {ranked.length} evaluados contra tu hembra · ordenado por compatibilidad · {excluded.length} excluidos
            </span>
          </div>
          {ranked.map((candidate, i) => (
            <MatchRow
              key={candidate.capabilityId}
              candidate={candidate}
              farmId={farmId}
              femaleId={femaleId}
              goal={goal}
              defaultExpanded={i === 0}
              onChoose={handleChoose}
              inPlan={chosenNaab === candidate.capabilityId}
              choosing={addItem.isPending || removeItem.isPending}
              next={ranked[i + 1]}
              onPreview={handlePreview}
              previewing={projectedNaab === candidate.capabilityId}
            />
          ))}
        </div>
      )}

      {excluded.length > 0 && (
        <div className="flex flex-col gap-2">
          {excluded.map((candidate) => (
            <Card key={candidate.capabilityId} className="flex items-center gap-3 p-3 opacity-60">
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-destructive">
                Excluido: {candidate.filters.find((f) => !f.passed)?.detail ?? 'motivo no especificado'}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
