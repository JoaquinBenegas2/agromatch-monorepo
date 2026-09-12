import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Compass, Dna } from 'lucide-react';
import type { BreedingGoal, ExplanationFacts, GoalPreset, MatchCandidate, TraitKey } from '@org/shared-types';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorMessage } from '@/components/ui/error-message';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SpatialLabel, SpatialScene } from '@/components/spatial/spatial-scene';
import { cn } from '@/lib/utils';
import { useActiveFarmId } from '../../shared/user/user-context.js';
import { useMatchBoard } from '../../shared/api/hooks/use-match-board.js';
import { useAddPlanItem, useRemovePlanItem } from '../../shared/api/hooks/use-plan-item-mutations.js';
import { useExplanation } from '../../shared/api/hooks/use-explanation.js';
import { useFemales } from '../../shared/api/hooks/use-herd.js';
import { usePlan } from '../../shared/api/hooks/use-plan.js';
import { MatchRow } from './match-row.js';
import '../_futuros/futuros-mockup.css';

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
  // Candidato con foco en el ranking: maneja tanto qué detalle se ve en el
  // result-panel como qué se proyecta en la escena.
  const [selectedNaab, setSelectedNaab] = useState<string | null>(null);
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

  useEffect(() => {
    setPreviewNaab(null);
    setSelectedNaab(null);
  }, [femaleId]);

  function handlePreview(candidate: MatchCandidate) {
    setPreviewNaab(candidate.capabilityId);
    setPreviewKey((key) => key + 1);
  }

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
  const selectedCandidate = ranked.find((c) => c.capabilityId === selectedNaab) ?? ranked[0];
  const sceneCandidate = ranked.find((c) => c.capabilityId === projectedNaab) ?? selectedCandidate;
  const sceneBullName =
    (sceneCandidate?.verticalFacts as ExplanationFacts | undefined)?.bull.name ??
    sceneCandidate?.capabilityId;
  const selectedFacts = selectedCandidate?.verticalFacts as ExplanationFacts | undefined;
  const currentFemale = females.data?.find((f) => f.id === femaleId);

  const explanation = useExplanation(
    farmId,
    femaleId ?? '',
    selectedCandidate?.capabilityId ?? '',
    goal,
    Boolean(femaleId && selectedCandidate),
  );

  const traitKeys = (
    selectedFacts?.expectedProgeny
      ? (Object.keys(selectedFacts.expectedProgeny) as TraitKey[])
      : []
  ).filter((key) => selectedFacts?.damTraits?.[key] != null && selectedFacts?.expectedProgeny?.[key] != null);

  if (females.isLoading) {
    return (
      <div className="futuros-page">
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!femaleId) {
    return (
      <div className="futuros-page">
        <EmptyState
          icon={<Dna />}
          title="Todavía no cargaste tu rodeo"
          description="Subí el Excel del rodeo para elegir una hembra y ver sus candidatos."
          action={
            <Link to="/motor-genetico/importar" className="btn primary">
              Subir Excel
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="futuros-page">
      <div className="pagehead" style={{ marginBottom: 18 }}>
        <div>
          <span className="eyebrow muted">Motor genético / Torinder</span>
          <h1>
            El futuro se <span className="serif">diseña.</span>
          </h1>
          <p>Una vaca. Un aporte. Explorá lo que podría cambiar en la próxima generación.</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {females.data && females.data.length > 0 && (
            <Select value={femaleId} onValueChange={(id) => navigate(`/motor-genetico/matching/${id}`)}>
              <SelectTrigger className="w-[170px]">
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
          )}
          <div className="goals">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={preset === p.id ? 'active' : ''}
                onClick={() => {
                  setPreset(p.id);
                  setGoal(presetGoal(p.id));
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {ranked.length > 0 && (
        <div className="matching-grid">
          <section>
            <div className={cn('encounter', Boolean(projectedNaab) && 'projected')}>
              <div className="giant-type">futuros.</div>
              <SpatialScene
                kind="genetic"
                options={{ progress: () => revealRef.current, projected: () => true }}
              >
                <SpatialLabel anchor="mother" className="-translate-x-1/2">
                  <span className="wl-over" style={{ display: 'block', fontSize: 8, opacity: 0.75, textTransform: 'uppercase' }}>
                    Tu hembra
                  </span>
                  <strong>{currentFemale?.visualId ?? femaleId}</strong>
                </SpatialLabel>
                <SpatialLabel anchor="bull" className="-translate-x-1/2">
                  <span className="wl-over" style={{ display: 'block', fontSize: 8, opacity: 0.75, textTransform: 'uppercase' }}>
                    {chosenNaab === sceneCandidate?.capabilityId
                      ? 'Toro elegido'
                      : previewNaab
                        ? 'Proyectando'
                        : 'Toro seleccionado'}
                  </span>
                  <strong>{sceneBullName}</strong>
                </SpatialLabel>
                <SpatialLabel anchor="calf" className="calf-label -translate-x-1/2">
                  <span className="wl-over" style={{ display: 'block', fontSize: 8, textTransform: 'uppercase' }}>
                    Próxima generación
                  </span>
                  <strong className="serif">Cría proyectada.</strong>
                </SpatialLabel>
              </SpatialScene>
              <span className="concept-note">
                Representación conceptual. No predice sexo, pelaje, aspecto ni resultado reproductivo.
              </span>
            </div>

            <div className="decision-bar">
              <p className="decision-copy">
                La escena conecta el origen con el aporte de {sceneBullName}. Compará el escenario antes de
                llevarlo al plan.
              </p>
              {selectedCandidate && (
                <button type="button" className="btn primary" onClick={() => handlePreview(selectedCandidate)}>
                  {projectedNaab === selectedCandidate.capabilityId ? 'Repetir escena' : 'Proyectar cría'}
                </button>
              )}
            </div>

            {selectedCandidate && (
              <div className="result-panel">
                <div className="result-title">
                  <h2>Por qué matchea</h2>
                  <span className="badge">
                    #{selectedCandidate.rank} de {selectedFacts?.totalCandidates ?? '—'} · {selectedCandidate.compatibility}
                  </span>
                </div>
                <p className="result-reasons">{selectedCandidate.reasons.join(' · ')}</p>
                {traitKeys.length > 0 && (
                  <div className="bars">
                    {traitKeys.map((key) => {
                      const from = selectedFacts!.damTraits![key]!;
                      const to = selectedFacts!.expectedProgeny![key]!;
                      const spread = Math.max(Math.abs(from), Math.abs(to), 1) * 1.4;
                      const pct = Math.min(100, Math.max(0, ((to + spread) / (spread * 2)) * 100));
                      return (
                        <Fragment key={key}>
                          <span>{TRAIT_LABEL[key] ?? key}</span>
                          <div className="bar-track">
                            <div className="bar-fill projected-bar" style={{ width: `${pct}%` }} />
                          </div>
                          <span>
                            {from.toFixed(2)} → {to.toFixed(2)}
                          </span>
                        </Fragment>
                      );
                    })}
                  </div>
                )}
                <p className="note">
                  A2/A2: {selectedFacts?.caseinOdds.betaA2A2 != null ? `${selectedFacts.caseinOdds.betaA2A2}%` : 'sin dato'} · BB:{' '}
                  {selectedFacts?.caseinOdds.kappaBB != null ? `${selectedFacts.caseinOdds.kappaBB}%` : 'sin dato'}
                </p>
                {explanation.isPending && <p className="note">Generando explicación…</p>}
                {explanation.isError && <ErrorMessage message={(explanation.error as Error).message} />}
                {explanation.data && <p className="note serif" style={{ fontSize: 13 }}>{explanation.data.text}</p>}

                <div className="row between" style={{ marginTop: 14 }}>
                  {chosenNaab === selectedCandidate.capabilityId ? (
                    <>
                      <span className="badge">En el plan</span>
                      <button type="button" className="btn ghost" onClick={() => handleChoose(selectedCandidate)} disabled={addItem.isPending || removeItem.isPending}>
                        Quitar del plan
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn" onClick={() => handleChoose(selectedCandidate)} disabled={addItem.isPending || removeItem.isPending}>
                      Elegir para el plan
                    </button>
                  )}
                </div>
              </div>
            )}

            {planError && <ErrorMessage message={(planError as Error).message} />}
          </section>

          <aside className="ranking">
            <div className="ranking-head">
              <h2>Toros candidatos</h2>
              <span className="badge">{ranked.length} elegibles</span>
            </div>
            {ranked.map((candidate) => (
              <MatchRow
                key={candidate.capabilityId}
                candidate={candidate}
                active={selectedCandidate?.capabilityId === candidate.capabilityId}
                onSelect={(c) => setSelectedNaab(c.capabilityId)}
              />
            ))}
            {excluded.length > 0 && (
              <p className="note" style={{ margin: '12px 16px' }}>
                {excluded.length} excluidos · {excluded[0]?.filters.find((f) => !f.passed)?.detail}
              </p>
            )}
          </aside>
        </div>
      )}

      {board.isPending && (
        <div className="stack">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {board.isError && <ErrorMessage message={(board.error as Error).message} />}

      {board.isSuccess && ranked.length === 0 && excluded.length === 0 && (
        <EmptyState icon={<Compass />} title="Sin candidatos" description="No hay toros evaluados todavía para esta hembra." />
      )}
    </div>
  );
}
