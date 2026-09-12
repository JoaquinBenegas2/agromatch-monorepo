import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, MessageCircle, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useContactGeneticMatch } from './match-contact.api';
import { TorinderMark } from './torinder-mark';
import { useProviders } from '../market/market.api';
import {
  BreedingGoalSchema,
  ExplanationFactsSchema,
  type BreedingGoal,
  type GoalPreset,
  type TraitKey,
} from '@org/shared-types';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { Skeleton } from '@/components/ui/skeleton';
import { SpatialLabel, SpatialScene } from '@/components/spatial/spatial-scene';
import { useActiveFarmId } from '@/shared/user/user-context';
import { useMatchBoard } from '@/shared/api/hooks/use-match-board';
import {
  useAddPlanItem,
  useRemovePlanItem,
} from '@/shared/api/hooks/use-plan-item-mutations';
import { useExplanation } from '@/shared/api/hooks/use-explanation';
import { useFemales } from '@/shared/api/hooks/use-herd';
import { usePlan } from '@/shared/api/hooks/use-plan';
import {
  GeneticsHeading,
  SceneControls,
  useEncounterSequence,
  useGeneticsMotion,
} from '../genetics/genetics-experience';

const PRESETS: { id: GoalPreset; label: string }[] = [
  { id: 'BALANCED', label: 'Equilibrado' },
  { id: 'SOLIDS_CHEESE', label: 'Más sólidos' },
  { id: 'A2_MILK', label: 'Leche A2' },
  { id: 'VOLUME', label: 'Volumen' },
  { id: 'HEALTH_LONGEVITY', label: 'Salud y longevidad' },
  { id: 'EFFICIENCY', label: 'Eficiencia' },
];
const TRAITS: Record<TraitKey, string> = {
  ci: 'CI',
  milk: 'Leche',
  fat: 'Grasa',
  pro: 'Proteína',
  pl: 'Vida productiva',
  scs: 'SCS',
  fs: 'Fertilidad',
  rfi: 'RFI',
};
const makeGoal = (preset: GoalPreset): BreedingGoal => ({
  preset,
  weights: {},
  wantBetaA2: preset === 'A2_MILK',
  wantKappaBB: false,
});
const number = (value: number) =>
  value.toLocaleString('es-AR', { maximumFractionDigits: 2 });

export function MatchingScreen() {
  const { femaleId } = useParams();
  const [farmId] = useActiveFarmId();
  const location = useLocation();
  const incoming = BreedingGoalSchema.safeParse(
    (location.state as { goal?: unknown } | null)?.goal,
  );
  const goal = incoming.success ? incoming.data : makeGoal('BALANCED');
  if (!farmId)
    return (
      <section className="gx-state">
        <h2>Elegí un establecimiento</h2>
        <p>El motor necesita un rodeo activo.</p>
      </section>
    );
  return (
    <MatchingEncounter
      key={`${farmId}:${femaleId ?? ''}:${JSON.stringify(goal)}`}
      farmId={farmId}
      femaleId={femaleId}
      initialGoal={goal}
    />
  );
}

function MatchingEncounter({
  farmId,
  femaleId,
  initialGoal,
}: {
  farmId: string;
  femaleId?: string;
  initialGoal: BreedingGoal;
}) {
  const navigate = useNavigate();
  const [goal, setGoal] = useState(initialGoal);
  const [selectedNaab, setSelectedNaab] = useState<string | null>(null);
  const [camera, setCamera] = useState<'orbit' | 'top' | 'front'>('orbit');
  const [exploded, setExploded] = useState(false);
  const [explain, setExplain] = useState(false);
  const [contactOpen, setContactOpen] = useState(false),
    [message, setMessage] = useState('');
  const { still } = useGeneticsMotion();
  const sequence = useEncounterSequence();
  const resultVisible = sequence.active && sequence.progress >= 1;
  const females = useFemales(farmId);
  const board = useMatchBoard(farmId, femaleId, goal);
  const plan = usePlan(farmId);
  const add = useAddPlanItem(farmId);
  const remove = useRemovePlanItem(farmId);
  const openConversation = useContactGeneticMatch(farmId);
  const providers = useProviders('GENETICS');
  const ranked = board.data?.ranked ?? [],
    excluded = board.data?.excluded ?? [];
  const candidate =
    ranked.find((c) => c.capabilityId === selectedNaab) ?? ranked[0];
  const parsed = ExplanationFactsSchema.safeParse(candidate?.verticalFacts);
  const facts = parsed.success ? parsed.data : undefined;
  const female = females.data?.find((f) => f.id === femaleId);
  const chosen = plan.data?.items.find((item) => item.femaleId === femaleId);
  const isChosen = chosen?.bullNaab === candidate?.capabilityId;
  const providerName =
    providers.data?.find((p) => p.id === candidate?.providerId)?.name ??
    'el proveedor del toro';
  const explanation = useExplanation(
    farmId,
    femaleId ?? '',
    candidate?.capabilityId ?? '',
    goal,
    Boolean(resultVisible && explain && facts),
  );
  useEffect(() => {
    if (!femaleId && females.data?.length)
      navigate(
        `/motor-genetico/matching/${encodeURIComponent(females.data[0].id)}`,
        { replace: true, state: { goal: initialGoal } },
      );
  }, [femaleId, females.data, navigate, initialGoal]);
  function resetScene() {
    sequence.reset();
    setExploded(false);
    setExplain(false);
    add.reset();
    remove.reset();
  }
  function save() {
    if (!femaleId || !candidate || !facts) return;
    if (isChosen) {
      remove.mutate(femaleId);
      return;
    }
    add.mutate({
      femaleId,
      bullNaab: candidate.capabilityId,
      semenType: facts.semenType,
      compatibility: candidate.compatibility,
      pricePerDose: null,
      goal,
    });
  }
  function contact() {
    setMessage(
      `Hola, me interesa ${facts?.bull.name ?? candidate?.capabilityId} para la vaca ${female?.visualId}. Quisiera consultar disponibilidad, precio por dosis y entrega.`,
    );
    openConversation.reset();
    setContactOpen(true);
  }
  if (females.isPending)
    return (
      <section className="gx-state" aria-label="Cargando rodeo">
        <Skeleton className="h-28 w-full" />
      </section>
    );
  if (females.error)
    return (
      <section className="gx-state">
        <ErrorMessage message={females.error.message} />
        <Button onClick={() => void females.refetch()}>Reintentar</Button>
      </section>
    );
  if (!females.data?.length)
    return (
      <section className="gx-view">
        <GeneticsHeading
          index="02"
          eyebrow="CRUZA / EL ORIGEN"
          title="El futuro"
          accent="se encuentra."
          description="Cada encuentro empieza con una historia. Traé tu rodeo y explorá lo que podría venir."
        />
        <div className="gx-state">
          <Button asChild>
            <Link to="/motor-genetico/importar">
              Dar vida a mi rodeo <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    );
  if (!femaleId)
    return (
      <section className="gx-state">
        <p>Abriendo el primer encuentro…</p>
      </section>
    );
  if (!female)
    return (
      <section className="gx-state">
        <h2>No encontramos esa vaca</h2>
        <p>No pertenece al rodeo activo o ya no está disponible.</p>
        <Button asChild>
          <Link to="/motor-genetico/tablero">Volver al rodeo</Link>
        </Button>
      </section>
    );
  return (
    <section className="gx-view gx-match" aria-label="Matching genético">
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-lg">
          <DialogTitle>Conversar con {providerName}</DialogTitle>
          <DialogDescription>
            Vaca {female.visualId} × {facts?.bull.name}. Enviá tu consulta para
            iniciar el chat con la central.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!facts || !candidate || openConversation.isPending) return;
              openConversation.mutate(
                { femaleId, bullNaab: candidate.capabilityId, goal, message },
                { onSuccess: (c) => navigate(`/negociacion/matches/${c.id}`) },
              );
            }}
          >
            <label
              htmlFor="first-provider-message"
              className="text-sm font-medium"
            >
              Tu primera consulta
            </label>
            <textarea
              id="first-provider-message"
              className="mt-2 min-h-32 w-full rounded-xl border bg-background p-3 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              disabled={openConversation.isPending}
            />
            {openConversation.error && (
              <ErrorMessage message={openConversation.error.message} />
            )}
            <Button
              className="mt-4 w-full"
              type="submit"
              disabled={!message.trim() || openConversation.isPending}
            >
              <MessageCircle />
              {openConversation.isPending
                ? 'Abriendo conversación…'
                : 'Enviar consulta y abrir chat'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <GeneticsHeading
        index="02"
        eyebrow="CRUZA / ENCUENTRO GENÉTICO"
        title="Torinder"
        accent=""
        mark={<TorinderMark />}
        description="Un origen. Otro futuro. Explorá el encuentro entre tu vaca y lo que querés aportar."
      >
        <div className="gx-fields">
          <label>
            Tu vaca
            <select
              aria-label="Elegir hembra"
              value={femaleId}
              onChange={(e) =>
                navigate(
                  `/motor-genetico/matching/${encodeURIComponent(e.target.value)}`,
                  { state: { goal } },
                )
              }
            >
              {females.data.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.visualId}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="gx-goals" aria-label="Objetivo del encuentro">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={goal.preset === p.id}
              onClick={() => {
                resetScene();
                setSelectedNaab(null);
                setGoal(makeGoal(p.id));
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {goal.preset === 'CUSTOM' && (
          <p className="gx-note">
            Objetivo personalizado recibido desde tu necesidad.
          </p>
        )}
        <div
          className="gx-candidates"
          aria-label="Toros candidatos"
          aria-busy={board.isFetching}
        >
          {ranked.map((c) => {
            const result = ExplanationFactsSchema.safeParse(c.verticalFacts);
            return (
              <button
                className="gx-candidate"
                key={c.capabilityId}
                type="button"
                aria-pressed={candidate?.capabilityId === c.capabilityId}
                onClick={() => {
                  resetScene();
                  setSelectedNaab(c.capabilityId);
                }}
              >
                <span>{String(c.rank).padStart(2, '0')}</span>
                <div>
                  <strong>
                    {result.success ? result.data.bull.name : c.capabilityId}
                  </strong>
                  <small>
                    {result.success
                      ? result.data.bull.company
                      : 'Central no disponible'}{' '}
                    {resultVisible && candidate?.capabilityId === c.capabilityId
                      ? ` · ${number(c.compatibility)} puntos`
                      : ''}
                  </small>
                </div>
                <ArrowRight />
              </button>
            );
          })}
        </div>
        {excluded.length > 0 && (
          <details className="gx-excluded">
            <summary>{excluded.length} toros excluidos · ver motivos</summary>
            <ul>
              {excluded.map((c) => (
                <li key={c.capabilityId}>
                  <strong>{c.capabilityId}</strong>
                  <br />
                  {c.filters
                    .filter((f) => !f.passed)
                    .map((f) => f.detail)
                    .join(' · ') || c.reasons.join(' · ')}
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="gx-note mt-4">
          Orden calculado por el motor. El score es un índice de compatibilidad,
          no una probabilidad.
        </p>
      </GeneticsHeading>
      {candidate && (
        <>
          <SpatialScene
            kind="genetic"
            className="gx-world"
            options={{
              immersive: true,
              progress: () => sequence.progressRef.current,
              projected: () => sequence.active,
              explode: () => exploded,
              camera: () => camera,
              reduced: () => still,
              paused: () => still,
            }}
          >
            <SpatialLabel anchor="mother">
              <small>El origen / tu rodeo</small>
              <strong>{female.visualId}</strong>
            </SpatialLabel>
            <SpatialLabel anchor="bull">
              <small>El aporte</small>
              <strong>{facts?.bull.name ?? candidate.capabilityId}</strong>
            </SpatialLabel>
            <SpatialLabel anchor="mother-data" className="gx-tag">
              {female.profile?.betaCasein ?? 'SIN GENOTIPO'}
            </SpatialLabel>
            <SpatialLabel anchor="bull-data" className="gx-tag">
              {facts?.bull.company ?? candidate.capabilityId}
            </SpatialLabel>
          </SpatialScene>
          <div className="gx-decision">
            {isChosen && (
              <Button className="gx-contact-button" onClick={contact}>
                <MessageCircle />
                Conversar con el proveedor
              </Button>
            )}
            {/* Guardar/quitar no depende de la animación de revelado: se
                puede confirmar apenas el motor trae los hechos, sin esperar
                los ~5s del recorrido "Explorar el encuentro". */}
            <Button
              onClick={save}
              disabled={
                add.isPending || remove.isPending || plan.isPending || plan.isError || !facts
              }
            >
              {add.isPending || remove.isPending
                ? 'Guardando…'
                : isChosen
                  ? 'Quitar del plan'
                  : 'Guardar este encuentro'}
              <Plus />
            </Button>
            <Button
              variant="ghost"
              className="gx-explore-button"
              onClick={() => sequence.play()}
              disabled={sequence.active && !resultVisible}
            >
              {sequence.active
                ? resultVisible
                  ? 'Repetir el recorrido'
                  : 'Explorando el encuentro…'
                : 'Explorar el encuentro'}
              <ArrowRight />
            </Button>
            {sequence.active && (
              <div className="gx-sequence">
                <span>ORIGEN</span>
                <input
                  aria-label="Recorrer el encuentro"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(sequence.progress * 100)}
                  onChange={(e) => sequence.scrub(Number(e.target.value) / 100)}
                />
                <output>{Math.round(sequence.progress * 100)}%</output>
                <span>FUTURO</span>
              </div>
            )}
            <div className="gx-plan-feedback" aria-live="polite">
              {isChosen && (
                <p className="gx-note">
                  ✓ Este encuentro está guardado en tu plan.
                </p>
              )}
              {chosen && !isChosen && (
                <p className="gx-note">
                  Al guardar, reemplazás el toro {chosen.bullNaab} para esta
                  vaca.
                </p>
              )}
              {(add.error || remove.error || plan.error) && (
                <ErrorMessage
                  message={
                    (add.error ?? remove.error ?? plan.error)?.message ??
                    'No se pudo actualizar el plan'
                  }
                />
              )}
              <Link className="gx-note" to="/motor-genetico/plan">
                Ver plan de servicios ↗
              </Link>
            </div>
            <p className="gx-note">
              Cría conceptual. Forma, sexo y pelaje no representan una
              predicción.
            </p>
          </div>
          <SceneControls
            camera={camera}
            onCamera={() =>
              setCamera((c) =>
                c === 'orbit' ? 'top' : c === 'top' ? 'front' : 'orbit',
              )
            }
            exploded={exploded}
            onExplode={
              sequence.active ? () => setExploded(!exploded) : undefined
            }
            onReset={sequence.active ? sequence.play : undefined}
          />
          {resultVisible && (
            <aside
              className="gx-result"
              aria-label="Resultado del encuentro"
              aria-live="polite"
            >
              <p className="gx-rank">
                #{candidate.rank} DE {facts?.totalCandidates ?? ranked.length} /{' '}
                {number(candidate.compatibility)} PUNTOS
              </p>
              <h2>Lo que podría cambiar.</h2>
              <p className="gx-reasons">
                {(facts?.reasons ?? candidate.reasons).slice(0, 2).join(' · ')}
              </p>
              <div className="gx-traits">
                {(Object.keys(TRAITS) as TraitKey[]).map((key) => {
                  const from = facts?.damTraits?.[key],
                    to = facts?.expectedProgeny?.[key];
                  return (
                    <div className="gx-trait" key={key}>
                      <span>{TRAITS[key]}</span>
                      <span>
                        {from != null && to != null
                          ? `${number(from)} → ${number(to)}`
                          : 'No estimable'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="gx-note">
                Valores en escala CDCB. Madre → cría esperada; los faltantes no
                se completan.
              </p>
              <div className="gx-metric">
                <span>Probabilidad A2/A2 / BB de la cría</span>
                <strong>
                  {facts?.caseinOdds.betaA2A2 != null
                    ? `${number(facts.caseinOdds.betaA2A2 * 100)}%`
                    : 'Sin dato'}{' '}
                  /{' '}
                  {facts?.caseinOdds.kappaBB != null
                    ? `${number(facts.caseinOdds.kappaBB * 100)}%`
                    : 'Sin dato'}
                </strong>
                <p className="gx-note">
                  Calculado por el motor según los genotipos disponibles.
                </p>
              </div>
              <details
                open={explain}
                onToggle={(e) => {
                  if (e.currentTarget.open !== explain)
                    setExplain(e.currentTarget.open);
                }}
              >
                <summary>Por qué matchea · explicación</summary>
                {explanation.isFetching && <p>Generando explicación…</p>}
                {explanation.error && (
                  <>
                    <ErrorMessage message={explanation.error.message} />
                    <Button
                      variant="ghost"
                      onClick={() => void explanation.refetch()}
                    >
                      Reintentar explicación
                    </Button>
                  </>
                )}
                {explanation.data && <p>{explanation.data.text}</p>}
              </details>
            </aside>
          )}
        </>
      )}
      {board.isPending && (
        <div className="gx-result">
          <Skeleton className="h-40 w-full" />
          <p className="gx-note mt-4">
            El motor está comparando los candidatos…
          </p>
        </div>
      )}
      {board.error && (
        <div className="gx-result">
          <ErrorMessage message={board.error.message} />
          <Button asChild className="mt-4">
            <Link to="/motor-genetico/tablero">Revisar clasificación</Link>
          </Button>
          <Button variant="ghost" onClick={() => void board.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {board.isSuccess && !ranked.length && (
        <div className="gx-result">
          <h2>Sin candidatos elegibles</h2>
          <p className="gx-note">
            {excluded.length
              ? 'Revisá los motivos de exclusión. Podés explorar otro objetivo o elegir otra vaca.'
              : 'El catálogo no contiene candidatos para esta clasificación.'}
          </p>
        </div>
      )}
    </section>
  );
}
