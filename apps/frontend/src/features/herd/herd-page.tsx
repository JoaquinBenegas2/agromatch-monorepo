import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  SpatialLabel,
  SpatialScene,
  type SpatialAnimal,
} from '@/components/spatial/spatial-scene';
import { ApiClientError } from '@/shared/api/client';
import {
  useClassificationSummary,
  useClassifyHerd,
  useFemales,
} from '@/shared/api/hooks/use-herd';
import {
  GeneticsHeading,
  SceneControls,
  useGeneticsMotion,
} from '../genetics/genetics-experience';

export const TIER_LABELS = {
  ELITE: 'Sexado',
  COMMERCIAL: 'Convencional',
  BEEF: 'Carne',
  CULL_ALERT: 'Alerta de salud',
  UNCLASSIFIED: 'Sin clasificar',
};
const goal = {
  preset: 'BALANCED' as const,
  weights: {},
  wantBetaA2: false,
  wantKappaBB: false,
};

export function HerdPage({ farmId }: { farmId: string }) {
  const females = useFemales(farmId),
    summary = useClassificationSummary(farmId),
    classify = useClassifyHerd(farmId);
  const [query, setQuery] = useState(''),
    [tier, setTier] = useState('all'),
    [tag, setTag] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [table, setTable] = useState(false);
  const [camera, setCamera] = useState<'orbit' | 'top' | 'front'>('orbit');
  const { still } = useGeneticsMotion();
  const animals = useMemo(
    () =>
      (females.data ?? []).map((f) => {
        const group = f.classification?.tier ?? 'UNCLASSIFIED';
        const visible =
          (tier === 'all' || tier === group) &&
          (!query || f.visualId.toLowerCase().includes(query.toLowerCase())) &&
          (!tag ||
            f.classification?.tags.some((t) =>
              t.toLowerCase().includes(tag.toLowerCase()),
            ));
        return { id: f.id, group, visible } satisfies SpatialAnimal;
      }),
    [females.data, tier, query, tag],
  );
  const visibleIds = new Set(animals.filter((a) => a.visible).map((a) => a.id));
  const filtered = females.data?.filter((f) => visibleIds.has(f.id)) ?? [];
  const selected = filtered.find((f) => f.id === selectedId) ?? filtered[0];
  if (females.isPending)
    return (
      <section className="gx-state">
        <Skeleton className="h-40 w-full" />
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
          index="03"
          eyebrow="RODEO / EL ORIGEN"
          title="Tu próxima"
          accent="historia."
          description="Subí el Excel de tu rodeo para clasificarlo y empezar a matchear."
        />
        <div className="gx-state">
          <Button asChild>
            <Link to="/motor-genetico/importar">
              Subir Excel <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    );
  const unclassified =
    summary.error instanceof ApiClientError &&
    summary.error.code === 'HERD_NOT_CLASSIFIED';
  const counts = Object.fromEntries(
    Object.keys(TIER_LABELS).map((t) => [
      t,
      animals.filter((a) => a.group === t).length,
    ]),
  );
  return (
    <section className="gx-view gx-herd">
      <GeneticsHeading
        index="03"
        eyebrow="RODEO / UN PAISAJE DE DECISIONES"
        title={String(females.data.length)}
        accent="historias vivas."
        description="Cada volumen es una vaca de tu rodeo. Su lugar y su color corresponden a la clasificación del motor."
      >
        <div className="gx-tier-filters" aria-label="Filtrar por destino">
          {Object.entries(TIER_LABELS)
            .filter(([key]) => counts[key] > 0)
            .map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTier(tier === key ? 'all' : key)}
                aria-pressed={tier === key}
              >
                <strong>{counts[key]}</strong>
                {label}
              </button>
            ))}
        </div>
        <div className="gx-herd-actions">
          <Button
            variant="secondary"
            onClick={() => classify.mutate(goal)}
            disabled={classify.isPending}
          >
            {classify.isPending
              ? 'Clasificando…'
              : unclassified
                ? 'Clasificar rodeo'
                : 'Reclasificar'}
          </Button>
          <Button variant="secondary" onClick={() => setTable(!table)}>
            {table ? 'Volver al paisaje' : 'Ver tabla'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setTier('all');
              setQuery('');
              setTag('');
            }}
          >
            Ver todas
          </Button>
        </div>
        <div className="gx-fields">
          <label>
            Buscar caravana
            <input
              aria-label="Buscar caravana"
              placeholder="Nombre o caravana"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="mt-3">
            Filtrar por tag
            <input
              aria-label="Filtrar por tag"
              placeholder="Ej. A2_NUCLEUS"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            />
          </label>
        </div>
        {unclassified && (
          <p className="gx-note mt-4">
            Tu rodeo está listo para clasificar. Los animales todavía no tienen
            destino asignado.
          </p>
        )}
        {classify.error && (
          <ErrorMessage className="mt-4" message={classify.error.message} />
        )}
        {summary.error && !unclassified && (
          <ErrorMessage message={summary.error.message} />
        )}
      </GeneticsHeading>
      {!table && (
        <SpatialScene
          kind="herd"
          className="gx-world"
          options={{
            immersive: true,
            animals: () => animals,
            selected: () => selected?.id ?? '',
            onSelect: setSelectedId,
            reduced: () => still,
            paused: () => still,
            camera: () => camera,
          }}
        >
          {Object.entries(TIER_LABELS)
            .filter(([key]) => counts[key] > 0)
            .map(([key, label]) => (
              <SpatialLabel key={key} anchor={`tier-${key}`}>
                <small>{label}</small>
                <strong>{counts[key]}</strong>
              </SpatialLabel>
            ))}
          {selected && (
            <SpatialLabel anchor="selected" className="gx-tag">
              {selected.visualId}
            </SpatialLabel>
          )}
        </SpatialScene>
      )}
      {table && (
        <div className="gx-herd-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caravana</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Motivos del motor</TableHead>
                <TableHead>Encuentro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.visualId}</TableCell>
                  <TableCell>
                    {TIER_LABELS[f.classification?.tier ?? 'UNCLASSIFIED']}
                  </TableCell>
                  <TableCell>
                    {f.classification?.reasons.join('; ') ||
                      'Sin clasificación'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" asChild>
                      <Link
                        to={`/motor-genetico/matching/${encodeURIComponent(f.id)}`}
                      >
                        Explorar <ArrowRight />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <aside className="gx-herd-sidebar gx-panel">
        <p className="gx-eyebrow">IDENTIDADES / {filtered.length}</p>
        <h2>Cada marca, una historia.</h2>
        <div className="gx-animal-list">
          {filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={selected?.id === f.id}
              onClick={() => setSelectedId(f.id)}
            >
              <span>{f.visualId}</span>
              <small>
                {TIER_LABELS[f.classification?.tier ?? 'UNCLASSIFIED']}
              </small>
            </button>
          ))}
          {!filtered.length && (
            <p className="gx-note">Ninguna vaca coincide con estos filtros.</p>
          )}
        </div>
        {selected && (
          <div className="gx-animal-detail">
            <p>
              SELECCIONADA /{' '}
              {TIER_LABELS[selected.classification?.tier ?? 'UNCLASSIFIED']}
            </p>
            <h2>{selected.visualId}</h2>
            <p>
              A2: {selected.profile?.betaCasein ?? 'Sin dato'} · Kappa:{' '}
              {selected.profile?.kappaCasein ?? 'Sin dato'}
            </p>
            <p>{selected.classification?.reasons.join(' · ')}</p>
            {selected.classification?.corrective.length ? (
              <p>
                Rasgos a corregir:{' '}
                {selected.classification.corrective.join(', ')}
              </p>
            ) : null}
            <Button asChild>
              <Link
                to={`/motor-genetico/matching/${encodeURIComponent(selected.id)}`}
              >
                Explorar su futuro <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
      </aside>
      <p className="gx-herd-foot">
        {summary.data ? (
          <>
            Con las reglas clásicas, {summary.data.classicRulesBeefCount} de{' '}
            {females.data.length} animales iban a carne.{' '}
          </>
        ) : null}
        Carne es un destino productivo. Las alertas de salud se muestran por
        separado.
      </p>
      {!table && (
        <SceneControls
          camera={camera}
          onCamera={() =>
            setCamera((c) =>
              c === 'orbit' ? 'top' : c === 'top' ? 'front' : 'orbit',
            )
          }
        />
      )}
    </section>
  );
}
