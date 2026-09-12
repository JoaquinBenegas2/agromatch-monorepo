import { useMemo, useState, type ReactNode } from 'react';
import type {
  CreateReviewBody,
  MatchBoard,
  MatchCandidate,
  Need,
  PublicProvider,
  ServiceRequest,
} from '@org/shared-types';
import { Ban, ExternalLink, Mail, MapPin, Phone, SearchX, Star } from 'lucide-react';
import { AiExplanation } from '@/components/ui/ai-explanation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { FilterChips } from '@/components/ui/filter-chips';
import { OfferCard } from '@/components/ui/offer-card';
import { Skeleton } from '@/components/ui/skeleton';
import { StarRating } from '@/components/ui/star-rating';
import { Textarea } from '@/components/ui/textarea';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { cn } from '@/lib/utils';

const EXCLUDED_PAGE_SIZE = 3;

type SortMode = 'engine' | 'reputation' | 'price';

const SORT_CHIPS = [
  { value: 'engine', label: 'Cercanía y disponibilidad' },
  { value: 'reputation', label: 'Mejor reputación' },
  { value: 'price', label: 'Menor precio/ha' },
];

export function ResultSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Cargando proveedores">
      {[0, 1, 2].map((index) => (
        <Card key={index} className="space-y-4 p-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-9 w-full" />
        </Card>
      ))}
    </div>
  );
}

function providerReputation(provider: PublicProvider): ReactNode {
  return provider.reputation.avg === null ? (
    'Sin valoraciones'
  ) : (
    <StarRating value={provider.reputation.avg} jobs={provider.reputation.jobs} />
  );
}

/**
 * N7: tres niveles visibles. "Con historial" no lo declara nadie: se gana
 * con trabajos valorados en la plataforma (`reputation.jobs`).
 */
function providerStatus(provider: PublicProvider): 'history' | 'verified' | 'unverified' {
  if (provider.reputation.jobs > 0) return 'history';
  return provider.verified ? 'verified' : 'unverified';
}

/** N4 (RN-36): valorar el trabajo cierra el ciclo necesidad → proveedor → solicitud → reseña. */
function ReviewForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (body: CreateReviewBody) => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  return (
    <div className="flex flex-col gap-3 border-t border-border-soft pt-4">
      <p className="text-[12.5px] font-semibold">¿Ya se hizo el trabajo? Valoralo</p>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Puntaje">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} de 5`}
            className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-primary data-[on=true]:text-primary"
            data-on={value <= rating}
            onClick={() => setRating(value)}
          >
            <Star className="size-5" fill={value <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <Textarea
        aria-label="Comentario de la valoración"
        value={comment}
        placeholder="Ej. Cumplió la fecha, buen trabajo."
        onChange={(event) => setComment(event.target.value)}
      />
      <Button
        variant="secondary"
        disabled={busy || rating === 0}
        onClick={() => void onSubmit({ rating, comment: comment.trim() }).catch(() => undefined)}
      >
        {busy ? 'Enviando…' : 'Enviar valoración'}
      </Button>
    </div>
  );
}

function RequestDialog({
  provider,
  request,
  reviewed,
  busy,
  reviewing,
  onSubmit,
  onReview,
  onClose,
}: {
  provider?: PublicProvider;
  request?: ServiceRequest;
  reviewed: boolean;
  busy: boolean;
  reviewing: boolean;
  onSubmit: (message: string) => Promise<void>;
  onReview: (body: CreateReviewBody) => Promise<void>;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const hasContact = Boolean(request?.contact.phone || request?.contact.email);
  return (
    <Dialog open={provider !== undefined} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{request ? 'Solicitud enviada' : `Pedir fecha a ${provider?.name ?? ''}`}</DialogTitle>
          <DialogDescription>
            {request
              ? 'El contacto se habilitó después de crear la solicitud. Antes no formaba parte del proveedor público.'
              : 'Contale brevemente qué necesitás. El contacto se mostrará cuando la solicitud haya sido enviada.'}
          </DialogDescription>
        </DialogHeader>
        {request ? (
          <>
            <div className="rounded-md border border-border bg-muted/40 p-4">
              {request.contact.phone ? (
                <p className="flex items-center gap-2 text-[13px]"><Phone className="size-4 text-primary" />{request.contact.phone}</p>
              ) : null}
              {request.contact.email ? (
                <p className="mt-2 flex items-center gap-2 text-[13px]"><Mail className="size-4 text-primary" />{request.contact.email}</p>
              ) : null}
              {!hasContact ? (
                <p className="text-[12.5px] text-muted-foreground">El proveedor responderá por el canal de la solicitud.</p>
              ) : null}
            </div>
            {reviewed ? (
              <p className="text-[12.5px] text-muted-foreground" role="status">
                Valoración enviada. Ya cuenta en la reputación de {provider?.name ?? 'este proveedor'}.
              </p>
            ) : (
              <ReviewForm busy={reviewing} onSubmit={onReview} />
            )}
          </>
        ) : (
          <>
            <Textarea
              aria-label="Mensaje para el proveedor"
              value={message}
              placeholder="Ej. Necesito coordinar el trabajo para la semana próxima…"
              onChange={(event) => setMessage(event.target.value)}
            />
            <Button disabled={busy || !message.trim()} onClick={() => void onSubmit(message).catch(() => undefined)}>
              {busy ? 'Enviando…' : 'Enviar solicitud'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Una única card para incluidos y excluidos (mismo diseño): un excluido se
 * distingue con un look apagado y una acción deshabilitada, nunca con un
 * componente distinto.
 */
function ResultOfferCard({
  candidate,
  provider,
  need,
  totalRanked,
  excluded,
  requesting,
  alreadyRequested,
  onRequestClick,
}: {
  candidate: MatchCandidate;
  provider: PublicProvider;
  need: Need;
  totalRanked: number;
  excluded: boolean;
  requesting: boolean;
  alreadyRequested: boolean;
  onRequestClick: () => void;
}) {
  const explanation = excluded
    ? {
        text: candidate.filters.find((filter) => !filter.passed)?.detail ?? candidate.reasons.join(' '),
        source: 'FALLBACK' as const,
      }
    : (candidate.explanation ?? { text: candidate.reasons.join(' '), source: 'FALLBACK' as const });

  return (
    <OfferCard
      className={cn(
        'group shadow-[0_8px_28px_rgba(27,28,27,0.04)] transition-transform duration-200',
        excluded ? 'grayscale opacity-60' : 'hover:-translate-y-0.5',
      )}
      image={
        <div className="relative flex size-full items-end overflow-hidden bg-[linear-gradient(135deg,var(--muted)_25%,transparent_25%),linear-gradient(225deg,var(--muted)_25%,transparent_25%),linear-gradient(45deg,var(--muted)_25%,transparent_25%),linear-gradient(315deg,var(--muted)_25%,var(--card)_25%)] bg-[length:18px_18px] bg-[position:9px_0,9px_0,0_0,0_0] p-3">
          {provider.imageUrl ? (
            <img
              src={provider.imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          {provider.imageUrl ? (
            <Badge variant="solid" className="absolute top-3 right-3 bg-card/90 text-foreground shadow-sm">
              Imagen ilustrativa
            </Badge>
          ) : null}
          <Badge variant="solid" className="bg-card text-foreground shadow-sm">
            <MapPin /> {candidate.reasons.join(' ').match(/[\d.,]+\s*km/i)?.[0] ?? provider.base.label}
          </Badge>
        </div>
      }
      title={provider.name}
      subtitle={`${need.what} · ${provider.base.label}`}
      rank={excluded ? undefined : { position: candidate.rank, total: totalRanked }}
      badges={
        <>
          {excluded ? <Badge variant="neutral">Excluido</Badge> : <VerificationBadge status={providerStatus(provider)} />}
          {!provider.verified ? <Badge variant="warn">Semilla</Badge> : null}
        </>
      }
      stats={[
        { label: 'Disponibilidad', value: candidate.fit.availability > 0 ? 'Consultar fecha' : 'No disponible' },
        { label: 'Reputación', value: providerReputation(provider) },
      ]}
      price={excluded ? undefined : 'A cotizar'}
      explanation={<AiExplanation text={explanation.text} source={explanation.source} />}
      secondaryAction={
        <Button asChild variant="ghost" size="sm" className="px-2">
          <a href={provider.source} target="_blank" rel="noreferrer" aria-label={`Ver fuente pública de ${provider.name}`}>
            <ExternalLink />
          </a>
        </Button>
      }
      primaryAction={
        excluded ? (
          <Button type="button" className="flex-1" variant="secondary" disabled>
            No cumple los filtros
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1"
            variant={candidate.rank === 1 ? 'primary' : 'secondary'}
            disabled={requesting}
            onClick={onRequestClick}
          >
            {alreadyRequested ? 'Ver solicitud · Valorar' : 'Pedir fecha'}
          </Button>
        )
      }
    />
  );
}

export function MarketResults({
  need,
  board,
  providers,
  providersLoading,
  requestError,
  requesting,
  reviewing,
  onEdit,
  onRequest,
  onReview,
}: {
  need: Need;
  board: MatchBoard;
  providers?: PublicProvider[];
  providersLoading: boolean;
  requestError?: Error | null;
  requesting: boolean;
  reviewing: boolean;
  onEdit: () => void;
  onRequest: (provider: PublicProvider, message: string) => Promise<ServiceRequest>;
  onReview: (requestId: string, body: CreateReviewBody) => Promise<void>;
}) {
  const [sortMode, setSortMode] = useState<SortMode>('engine');
  const [excludedShown, setExcludedShown] = useState(0);
  const [request, setRequest] = useState<ServiceRequest>();
  const [selectedProvider, setSelectedProvider] = useState<PublicProvider>();
  // Solicitudes hechas en esta sesión, por proveedor: permiten reabrir el
  // diálogo para valorar sin volver a pedir fecha.
  const [sentRequests, setSentRequests] = useState<Map<string, ServiceRequest>>(() => new Map());
  const [reviewedRequestIds, setReviewedRequestIds] = useState<Set<string>>(() => new Set());
  const providerById = useMemo(
    () => new Map((providers ?? []).map((provider) => [provider.id, provider])),
    [providers],
  );
  const ranked = useMemo(() => {
    const copy = [...board.ranked];
    if (sortMode === 'reputation') {
      copy.sort(
        (a, b) =>
          (providerById.get(b.providerId)?.reputation.avg ?? -1) -
          (providerById.get(a.providerId)?.reputation.avg ?? -1),
      );
    } else if (sortMode === 'price') {
      copy.sort((a, b) => b.fit.price - a.fit.price);
    } else {
      copy.sort((a, b) => a.rank - b.rank);
    }
    return copy;
  }, [board.ranked, providerById, sortMode]);

  async function requestProvider(provider: PublicProvider, message: string) {
    const created = await onRequest(provider, message);
    setRequest(created);
    setSentRequests((current) => new Map(current).set(provider.id, created));
  }

  async function reviewRequest(body: CreateReviewBody) {
    if (!request) return;
    await onReview(request.id, body);
    setReviewedRequestIds((current) => new Set(current).add(request.id));
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[17px] font-bold tracking-tight">Soluciones para tu necesidad</p>
          <p className="text-[11px] text-muted-foreground">El orden del motor es neutral; los filtros solo cambian esta vista.</p>
        </div>
        <FilterChips
          chips={SORT_CHIPS}
          value={[sortMode]}
          multiple={false}
          onValueChange={(value) => setSortMode((value[0] as SortMode | undefined) ?? 'engine')}
        />
      </div>

      {requestError ? <ErrorMessage message={requestError.message} /> : null}
      {providersLoading ? <ResultSkeleton /> : null}

      {!providersLoading && ranked.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Todavía no hay proveedores para esta categoría"
          description="La necesidad quedó guardada. Podés editarla o volver cuando se incorporen nuevas soluciones."
          action={<Button variant="secondary" onClick={onEdit}>Editar necesidad</Button>}
        />
      ) : null}

      {!providersLoading && ranked.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ranked.map((candidate) => {
            const provider = providerById.get(candidate.providerId);
            if (!provider) return null;
            return (
              <ResultOfferCard
                key={candidate.capabilityId}
                candidate={candidate}
                provider={provider}
                need={need}
                totalRanked={board.ranked.length}
                excluded={false}
                requesting={requesting}
                alreadyRequested={sentRequests.has(provider.id)}
                onRequestClick={() => {
                  // Ya solicitado: se reabre para ver el contacto y valorar el trabajo.
                  setRequest(sentRequests.get(provider.id));
                  setSelectedProvider(provider);
                }}
              />
            );
          })}
        </div>
      ) : null}

      {board.excluded.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-muted-foreground">
            <Ban className="size-4" /> Excluidos ({board.excluded.length})
          </p>

          {excludedShown > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {board.excluded.slice(0, excludedShown).map((candidate) => {
                const provider = providerById.get(candidate.providerId);
                if (!provider) return null;
                return (
                  <ResultOfferCard
                    key={candidate.capabilityId}
                    candidate={candidate}
                    provider={provider}
                    need={need}
                    totalRanked={board.ranked.length}
                    excluded
                    requesting={false}
                    alreadyRequested={false}
                    onRequestClick={() => undefined}
                  />
                );
              })}
            </div>
          ) : null}

          {excludedShown < board.excluded.length ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setExcludedShown((current) => Math.min(current + EXCLUDED_PAGE_SIZE, board.excluded.length))}
            >
              {excludedShown === 0
                ? `Cargar excluidos (${board.excluded.length})`
                : `Cargar ${Math.min(EXCLUDED_PAGE_SIZE, board.excluded.length - excludedShown)} más (${board.excluded.length - excludedShown} restantes)`}
            </Button>
          ) : null}
        </div>
      ) : null}

      <RequestDialog
        key={selectedProvider?.id ?? 'closed'}
        provider={selectedProvider}
        request={request}
        reviewed={request !== undefined && reviewedRequestIds.has(request.id)}
        busy={requesting}
        reviewing={reviewing}
        onSubmit={(message) =>
          selectedProvider ? requestProvider(selectedProvider, message) : Promise.resolve()
        }
        onReview={reviewRequest}
        onClose={() => {
          setSelectedProvider(undefined);
          setRequest(undefined);
        }}
      />
    </>
  );
}
