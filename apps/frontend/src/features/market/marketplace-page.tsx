import { useRef, useState } from 'react';
import type { MatchBoard, Need, PublicProvider, ServiceRequest, UpdateNeedBody } from '@org/shared-types';
import { Filter, Mic, Send, Sparkles, Stethoscope, Tractor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CowLoader } from '@/components/ui/cow-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { SpatialLabel, SpatialScene } from '@/components/spatial/spatial-scene';
import { cn } from '@/lib/utils';
import { useActiveFarmId, useUser } from '../../shared/user/user-context.js';
import { NeedFilterBar } from './need-filter-bar.js';
import { MarketResults } from './market-results.js';
import { useSpeechToText } from './use-speech-to-text.js';
import {
  useCreateNeed,
  useCreateReview,
  useCreateServiceRequest,
  useMatchNeed,
  useProviders,
  useUpdateNeed,
} from './market.api.js';
import '../_futuros/futuros-mockup.css';

const QUICK_NEEDS = [
  { label: 'Contratistas de arada cerca tuyo', prompt: 'necesito quien me are 40 ha en Río Cuarto la semana que viene', icon: Tractor },
  { label: 'Veterinario para control reproductivo', prompt: 'necesito veterinario para el rodeo, control reproductivo urgente', icon: Stethoscope },
  { label: 'Mejorar los sólidos de mi tambo', prompt: 'quiero mejorar los sólidos de mi tambo con toros que den más grasa y proteína', icon: Sparkles },
];

function mutationError(...errors: Array<Error | null | undefined>): Error | undefined {
  return errors.find((error): error is Error => error instanceof Error);
}

function toUpdateBody(need: Need): UpdateNeedBody {
  return {
    category: need.category,
    what: need.what,
    where: need.where,
    radiusKm: need.radiusKm,
    window: need.window,
    magnitude: need.magnitude,
    constraints: need.constraints,
    budget: need.budget,
    goal: need.goal,
    confirm: true,
  };
}

function LoadingInterpretation() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
      <CowLoader label="Interpretando tu necesidad…" />
    </div>
  );
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [farmId] = useActiveFarmId();
  const [query, setQuery] = useState('');
  const [need, setNeed] = useState<Need>();
  const [board, setBoard] = useState<MatchBoard>();
  const createNeed = useCreateNeed();
  const updateNeed = useUpdateNeed();
  const matchNeed = useMatchNeed();
  const createRequest = useCreateServiceRequest();
  const createReview = useCreateReview();
  const providers = useProviders(need?.category);
  const error = mutationError(createNeed.error, updateNeed.error, matchNeed.error);
  const queryRef = useRef(query);
  queryRef.current = query;
  // Ni bien el reconocimiento de voz termina de interpretar lo que dijiste,
  // dispara la búsqueda solo — no hace falta tocar "Preguntar" después.
  const speech = useSpeechToText((transcript) => {
    const next = queryRef.current.trim() ? `${queryRef.current.trim()} ${transcript}` : transcript;
    setQuery(next);
    void ask(next).catch(() => undefined);
  });

  async function ask(rawText: string) {
    if (!farmId || !rawText.trim()) return;
    createNeed.reset();
    updateNeed.reset();
    matchNeed.reset();
    setBoard(undefined);
    const created = await createNeed.mutateAsync({ rawText: rawText.trim(), farmId });
    if (created.category === 'GENETICS') {
      navigate('/motor-genetico/matching', { state: { needId: created.id, goal: created.goal } });
      return;
    }
    setNeed(created);
    await search(created);
  }

  async function search(target: Need) {
    updateNeed.reset();
    matchNeed.reset();
    const confirmed = await updateNeed.mutateAsync({ id: target.id, body: toUpdateBody(target) });
    setNeed(confirmed);
    const nextBoard = await matchNeed.mutateAsync(confirmed.id);
    setBoard(nextBoard);
  }

  async function requestProvider(provider: PublicProvider, message: string): Promise<ServiceRequest> {
    if (!need) throw new Error('No hay una necesidad confirmada');
    return createRequest.mutateAsync({
      needId: need.id,
      body: { providerId: provider.id, message },
    });
  }

  function editQuery() {
    setQuery(need?.rawText ?? '');
    setNeed(undefined);
    setBoard(undefined);
  }

  if (createNeed.isPending) return <LoadingInterpretation />;

  if (need) {
    const searching = updateNeed.isPending || matchNeed.isPending;
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 py-5 sm:py-7">
        <NeedFilterBar
          need={need}
          onChange={setNeed}
          onEditQuery={editQuery}
          onSearch={() => void search(need).catch(() => undefined)}
          busy={searching}
        />

        {error ? <ErrorMessage message={error.message} /> : null}

        {searching ? <CowLoader /> : null}

        {!searching && board ? (
          <MarketResults
            need={need}
            board={board}
            providers={providers.data}
            providersLoading={providers.isLoading}
            requestError={createRequest.error ?? createReview.error}
            requesting={createRequest.isPending}
            reviewing={createReview.isPending}
            onEdit={() => setBoard(undefined)}
            onRequest={requestProvider}
            onReview={(requestId, body) => createReview.mutateAsync({ requestId, body }).then(() => undefined)}
          />
        ) : null}

        {!searching && !board ? (
          <EmptyState
            icon={<Filter />}
            title="No pudimos completar la búsqueda"
            description="Ajustá los filtros de arriba y tocá Buscar para reintentar."
            action={<Button variant="secondary" onClick={() => void search(need).catch(() => undefined)}>Reintentar</Button>}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="futuros-page market-fill">
      <section className="market-hero">
        <div className="market-copy">
          <span className="eyebrow muted">Mercado y oportunidades</span>
          <h1>¿Qué necesita tu establecimiento hoy?</h1>
          <p>Hora de empezar, {user.name}. Contanos qué buscás y AgroMatch busca al instante, con filtros que podés ajustar arriba.</p>

          {error ? (
            <div className="stack" style={{ marginTop: 12 }}>
              <ErrorMessage message={error.message} />
            </div>
          ) : null}

          <form
            className="need-form"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(query).catch(() => undefined);
            }}
          >
            <label className="sr-only" htmlFor="need">
              Necesidad
            </label>
            <textarea
              id="need"
              aria-label="Necesidad"
              placeholder="¿Qué necesitás?"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="row between">
              <span className="note">En tus palabras. Como a un vecino.</span>
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className={cn('btn ghost', speech.listening && 'listening')}
                  disabled={!speech.supported}
                  onClick={speech.toggle}
                  title={
                    speech.supported
                      ? speech.listening
                        ? 'Escuchando… tocá para detener'
                        : 'Dictar por voz'
                      : 'Tu navegador no soporta dictado por voz'
                  }
                  aria-label={
                    speech.supported
                      ? speech.listening
                        ? 'Detener dictado'
                        : 'Dictar necesidad por voz'
                      : 'Audio no disponible en este navegador'
                  }
                >
                  <Mic className="icon" style={{ width: 16, height: 16 }} />
                </button>
                <button className="btn primary" type="submit" disabled={!query.trim()}>
                  Preguntar <Send className="icon" style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          </form>

          <div className="examples" aria-label="Ejemplos de necesidades">
            {QUICK_NEEDS.map(({ label, prompt, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setQuery(prompt);
                  void ask(prompt).catch(() => undefined);
                }}
              >
                <Icon className="icon" style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <SpatialScene kind="market">
          <SpatialLabel anchor="need" className="-translate-x-1/2">
            <span className="inline-flex items-center rounded-full bg-[#f2f5e7ee] px-2.5 py-1 text-[9px] font-semibold tracking-[0.08em] text-[#1e4c3a] uppercase shadow-sm backdrop-blur">
              Tu necesidad
            </span>
          </SpatialLabel>
        </SpatialScene>
      </section>
    </div>
  );
}
