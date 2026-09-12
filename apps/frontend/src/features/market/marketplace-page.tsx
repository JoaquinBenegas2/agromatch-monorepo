import { useState } from 'react';
import type { MatchBoard, Need, PublicProvider, ServiceRequest, UpdateNeedBody } from '@org/shared-types';
import { ArrowUpRight, Filter, Mic, Send, Sparkles, Stethoscope, Tractor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CowLoader } from '@/components/ui/cow-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Input } from '@/components/ui/input';
import { SpatialLabel, SpatialScene } from '@/components/spatial/spatial-scene';
import { useActiveFarmId, useUser } from '../../shared/user/user-context.js';
import { NeedFilterBar } from './need-filter-bar.js';
import { MarketResults } from './market-results.js';
import {
  useCreateNeed,
  useCreateReview,
  useCreateServiceRequest,
  useMatchNeed,
  useProviders,
  useUpdateNeed,
} from './market.api.js';

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
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 py-10">
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
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 py-5 sm:py-7">
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
    <div className="relative isolate overflow-hidden rounded-2xl bg-[#dfe7d1] p-8 md:min-h-[540px] md:p-12">
      <div className="relative z-[5] flex max-w-[540px] flex-col gap-5">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Hora de empezar, {user.name}
        </p>
        <h1 className="text-balance text-[36px] leading-[1.02] font-semibold tracking-[-0.03em] sm:text-[48px]">
          ¿Qué necesita tu establecimiento hoy?
        </h1>
        <p className="max-w-[360px] text-[13px] text-muted-foreground">
          Contanos qué buscás. AgroMatch entiende tu necesidad y busca al instante; los filtros quedan arriba para que los ajustes.
        </p>

        {error ? <ErrorMessage className="text-left" message={error.message} /> : null}

        <Card className="flex w-full max-w-[420px] items-center gap-2 border-[#aac092] bg-[#f2f5e7]/95 p-2 pl-4 shadow-[0_18px_40px_rgba(35,69,50,0.10)] backdrop-blur">
          <Input
            aria-label="Necesidad"
            className="h-11 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder="Preguntale a AgroMatch…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void ask(query).catch(() => undefined);
            }}
          />
          <Button type="button" variant="ghost" size="icon" disabled title="Audio: hoja de ruta" aria-label="Audio no disponible todavía">
            <Mic />
          </Button>
          <Button type="button" size="lg" disabled={!query.trim()} onClick={() => void ask(query).catch(() => undefined)}>
            Preguntar <Send />
          </Button>
        </Card>

        <div className="flex flex-wrap gap-4">
          {QUICK_NEEDS.map(({ label, prompt, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setQuery(prompt);
                void ask(prompt).catch(() => undefined);
              }}
              className="group inline-flex items-center gap-1.5 border-b border-[#b3c2a7] pb-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <Icon className="size-3.5" /> {label} <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>

      <SpatialScene
        kind="market"
        className="absolute top-8 right-[-4%] hidden h-[460px] w-[62%] rounded-xl md:block"
      >
        <SpatialLabel anchor="need" className="-translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-[#f2f5e7ee] px-2.5 py-1 text-[9px] font-semibold tracking-[0.08em] text-[#1e4c3a] uppercase shadow-sm backdrop-blur">
            Tu necesidad
          </span>
        </SpatialLabel>
        <span className="pointer-events-none absolute right-3 bottom-2 z-[2] text-[9px] text-[#4f6b45]">
          Vista conceptual, no representa proveedores reales
        </span>
      </SpatialScene>
    </div>
  );
}
