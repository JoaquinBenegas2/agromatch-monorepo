import { useState } from 'react';
import type { MatchBoard, Need, PublicProvider, ServiceRequest, UpdateNeedBody } from '@org/shared-types';
import { Mic, Send, Sparkles, Stethoscope, Tractor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ErrorMessage } from '@/components/ui/error-message';
import { Skeleton } from '@/components/ui/skeleton';
import { SpatialLabel, SpatialScene } from '@/components/spatial/spatial-scene';
import { useActiveFarmId, useUser } from '../../shared/user/user-context.js';
import { NeedInterpretation } from './need-interpretation.js';
import { MarketResults } from './market-results.js';
import {
  useCreateNeed,
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
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 py-10" aria-label="Interpretando necesidad">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-11 w-full" />
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
  const providers = useProviders(need?.category);
  const error = mutationError(createNeed.error, updateNeed.error, matchNeed.error);

  async function ask(rawText: string) {
    if (!farmId || !rawText.trim()) return;
    createNeed.reset();
    updateNeed.reset();
    matchNeed.reset();
    setBoard(undefined);
    const created = await createNeed.mutateAsync({ rawText: rawText.trim(), farmId });
    setNeed(created);
  }

  async function confirm() {
    if (!need) return;
    if (need.category === 'GENETICS') {
      navigate('/motor-genetico/matching', { state: { needId: need.id, goal: need.goal } });
      return;
    }
    updateNeed.reset();
    matchNeed.reset();
    const confirmed = await updateNeed.mutateAsync({ id: need.id, body: toUpdateBody(need) });
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

  if (need && board) {
    return (
      <MarketResults
        need={need}
        board={board}
        providers={providers.data}
        providersLoading={providers.isLoading}
        requestError={createRequest.error}
        requesting={createRequest.isPending}
        onEdit={() => setBoard(undefined)}
        onRequest={requestProvider}
      />
    );
  }

  if (need) {
    return (
      <>
        {error ? <div className="mx-auto mt-5 w-full max-w-[640px]"><ErrorMessage message={error.message} /></div> : null}
        <NeedInterpretation
          need={need}
          onChange={setNeed}
          onEditQuery={editQuery}
          onConfirm={() => void confirm().catch(() => undefined)}
          busy={updateNeed.isPending || matchNeed.isPending}
        />
      </>
    );
  }

  return (
    <div className="futuros-page">
      <section className="market-hero">
        <div className="market-copy">
          <span className="eyebrow muted">Mercado y oportunidades</span>
          <h1>¿Qué necesita tu establecimiento hoy?</h1>
          <p>Hora de empezar, {user.name}. Contanos qué buscás y AgroMatch lo ordena antes de buscar.</p>

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
                <button type="button" className="btn ghost" disabled title="Audio: hoja de ruta" aria-label="Audio no disponible todavía">
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
          <span className="pointer-events-none absolute bottom-2 left-3 z-[2] text-[9px] text-[#4f6b45]">
            Vista conceptual, no representa proveedores reales
          </span>
        </SpatialScene>
      </section>
      <div className="market-foot">
        <span>
          <strong>Prestadores por suscripción.</strong> Sin comisión por trabajo ni pago por posición.
        </span>
      </div>
    </div>
  );
}
