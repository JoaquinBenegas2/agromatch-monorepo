import { useMemo, useState } from 'react';
import type {
  MatchBoard,
  MatchCandidate,
  Need,
  PublicProvider,
  ServiceRequest,
} from '@org/shared-types';
import { Ban, ExternalLink, Mail, MapPin, Phone, SearchX } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { VerificationBadge } from '@/components/ui/verification-badge';

type SortMode = 'engine' | 'reputation' | 'price';

const SORT_CHIPS = [
  { value: 'engine', label: 'Cercanía y disponibilidad' },
  { value: 'reputation', label: 'Mejor reputación' },
  { value: 'price', label: 'Menor precio/ha' },
];

function formatWindow(need: Need): string {
  if (!need.window) return 'Sin fecha';
  const format = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(`${value}T12:00:00`));
  return `${format(need.window.from)} – ${format(need.window.to)}`;
}

function summary(need: Need): string {
  const magnitude = need.magnitude ? `${need.magnitude.value} ${need.magnitude.unit}` : 'cantidad a definir';
  return `${need.what} · ${magnitude} · ${need.where?.label ?? 'sin ubicación'}${need.radiusKm ? ` +${need.radiusKm} km` : ''} · ${formatWindow(need)}`;
}

function ResultSkeleton() {
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

function providerReputation(provider: PublicProvider): string {
  return provider.reputation.avg === null
    ? 'Sin valoraciones'
    : `${provider.reputation.avg.toLocaleString('es-AR', { maximumFractionDigits: 1 })} · ${provider.reputation.jobs}`;
}

function RequestDialog({
  provider,
  request,
  busy,
  onSubmit,
  onClose,
}: {
  provider?: PublicProvider;
  request?: ServiceRequest;
  busy: boolean;
  onSubmit: (message: string) => Promise<void>;
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
          <div className="rounded-md border border-border bg-muted/40 p-4">
            {request.contact.phone ? (
              <p className="flex items-center gap-2 font-mono text-[13px]"><Phone className="size-4 text-primary" />{request.contact.phone}</p>
            ) : null}
            {request.contact.email ? (
              <p className="mt-2 flex items-center gap-2 font-mono text-[13px]"><Mail className="size-4 text-primary" />{request.contact.email}</p>
            ) : null}
            {!hasContact ? (
              <p className="text-[12.5px] text-muted-foreground">El proveedor responderá por el canal de la solicitud.</p>
            ) : null}
          </div>
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

export function MarketResults({
  need,
  board,
  providers,
  providersLoading,
  requestError,
  requesting,
  onEdit,
  onRequest,
}: {
  need: Need;
  board: MatchBoard;
  providers?: PublicProvider[];
  providersLoading: boolean;
  requestError?: Error | null;
  requesting: boolean;
  onEdit: () => void;
  onRequest: (provider: PublicProvider, message: string) => Promise<ServiceRequest>;
}) {
  const [sortMode, setSortMode] = useState<SortMode>('engine');
  const [request, setRequest] = useState<ServiceRequest>();
  const [selectedProvider, setSelectedProvider] = useState<PublicProvider>();
  const [sentProviderIds, setSentProviderIds] = useState<Set<string>>(() => new Set());
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
    setSentProviderIds((current) => new Set(current).add(provider.id));
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 py-5 sm:py-7">
      <Card className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11.5px] text-muted-foreground">{summary(need)}</p>
        <Button type="button" variant="link" onClick={onEdit}>Editar búsqueda</Button>
      </Card>

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
              <OfferCard
                key={candidate.capabilityId}
                className="group shadow-[0_8px_28px_rgba(27,28,27,0.04)] transition-transform duration-200 hover:-translate-y-0.5"
                image={
                  <div className="relative flex size-full items-end overflow-hidden bg-[linear-gradient(135deg,var(--muted)_25%,transparent_25%),linear-gradient(225deg,var(--muted)_25%,transparent_25%),linear-gradient(45deg,var(--muted)_25%,transparent_25%),linear-gradient(315deg,var(--muted)_25%,var(--card)_25%)] bg-[length:18px_18px] bg-[position:9px_0,9px_0,0_0,0_0] p-3">
                    <Badge variant="solid" className="bg-card font-sans text-foreground shadow-sm"><MapPin /> {candidate.reasons.join(' ').match(/[\d.,]+\s*km/i)?.[0] ?? provider.base.label}</Badge>
                  </div>
                }
                title={provider.name}
                subtitle={`${need.what} · ${provider.base.label}`}
                rank={{ position: candidate.rank, total: board.ranked.length }}
                badges={
                  <>
                    <VerificationBadge status={provider.verified ? 'verified' : 'unverified'} />
                    {!provider.verified ? <Badge variant="warn">Semilla</Badge> : null}
                  </>
                }
                stats={[
                  { label: 'Disponibilidad', value: candidate.fit.availability > 0 ? 'Consultar fecha' : 'No disponible' },
                  { label: 'Reputación', value: providerReputation(provider) },
                ]}
                price="A cotizar"
                explanation={<AiExplanation text={candidate.reasons.join(' ')} source="FALLBACK" />}
                secondaryAction={
                  <Button asChild variant="ghost" size="sm" className="px-2">
                    <a href={provider.source} target="_blank" rel="noreferrer" aria-label={`Ver fuente pública de ${provider.name}`}><ExternalLink /></a>
                  </Button>
                }
                primaryAction={
                  <Button
                    type="button"
                    className="flex-1"
                    variant={candidate.rank === 1 ? 'primary' : 'secondary'}
                    disabled={requesting || sentProviderIds.has(provider.id)}
                    onClick={() => {
                      setRequest(undefined);
                      setSelectedProvider(provider);
                    }}
                  >
                    {sentProviderIds.has(provider.id) ? 'Solicitud enviada' : 'Pedir fecha'}
                  </Button>
                }
              />
            );
          })}
        </div>
      ) : null}

      {board.excluded.length > 0 ? (
        <details className="group rounded-lg border border-border bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[12.5px] font-semibold">
            <Ban className="size-4 text-muted-foreground" /> Excluidos ({board.excluded.length})
          </summary>
          <div className="border-t border-border-soft px-4 py-3">
            {board.excluded.map((candidate: MatchCandidate) => (
              <div key={candidate.capabilityId} className="flex gap-3 border-b border-border-soft py-2 last:border-0">
                <span className="font-medium">{providerById.get(candidate.providerId)?.name ?? candidate.providerId}</span>
                <span className="text-muted-foreground">
                  {candidate.filters.find((filter) => !filter.passed)?.detail ?? candidate.reasons.join(' ')}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <RequestDialog
        key={selectedProvider?.id ?? 'closed'}
        provider={selectedProvider}
        request={request}
        busy={requesting}
        onSubmit={(message) =>
          selectedProvider ? requestProvider(selectedProvider, message) : Promise.resolve()
        }
        onClose={() => {
          setSelectedProvider(undefined);
          setRequest(undefined);
        }}
      />
    </div>
  );
}
