import type { Need, NeedCategory, Unit } from '@org/shared-types';
import { AlertTriangle, CalendarDays, ChevronDown, MapPin, PencilLine, Ruler, Tractor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const CATEGORIES: Array<{ value: NeedCategory; label: string }> = [
  { value: 'MACHINERY', label: 'Servicio de maquinaria' },
  { value: 'VET', label: 'Veterinaria' },
  { value: 'GENETICS', label: 'Genética' },
  { value: 'INPUTS', label: 'Insumos' },
  { value: 'ADVISORY', label: 'Asesoramiento' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'FINANCE', label: 'Financiamiento' },
  { value: 'OTHER', label: 'Otra necesidad' },
];

const UNITS: Array<{ value: Unit; label: string }> = [
  { value: 'HA', label: 'hectáreas' },
  { value: 'HEAD', label: 'cabezas' },
  { value: 'TON', label: 'toneladas' },
  { value: 'UNIT', label: 'unidades' },
  { value: 'VISIT', label: 'visitas' },
];

const PLACES = [
  { label: 'Río Cuarto, Córdoba', lat: -33.124, lng: -64.349 },
  { label: 'Villa María, Córdoba', lat: -32.41, lng: -63.24 },
  { label: 'Cuenca lechera de Córdoba (demo)', lat: -32.4, lng: -63.24 },
  { label: 'Rosario, Santa Fe', lat: -32.944, lng: -60.65 },
];

function needsReview(need: Need, ...fields: string[]): boolean {
  return fields.some(
    (field) =>
      need.missingFields?.includes(field) === true ||
      (need.confidence?.[field] !== undefined && (need.confidence[field] ?? 1) < 0.8),
  );
}

function formatWindow(need: Need): string | undefined {
  if (!need.window?.from || !need.window.to) return undefined;
  const format = (value: string) => new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(`${value}T12:00:00`));
  return `${format(need.window.from)} – ${format(need.window.to)}`;
}

function Pill({
  icon,
  label,
  warn,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  warn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors',
            warn
              ? 'border-warning/50 border-dashed bg-warning-soft text-warning hover:bg-warning-soft/80'
              : 'border-border bg-card text-foreground hover:bg-muted',
          )}
        >
          <span className="[&_svg]:size-3.5">{icon}</span>
          {label}
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-64">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function NeedFilterBar({
  need,
  onChange,
  onEditQuery,
  onSearch,
  busy,
}: {
  need: Need;
  onChange: (need: Need) => void;
  onEditQuery: () => void;
  onSearch: () => void;
  busy: boolean;
}) {
  const place = need.where?.label ?? '';
  const places =
    need.where && !PLACES.some((candidate) => candidate.label === need.where?.label)
      ? [{ label: need.where.label, lat: need.where.lat, lng: need.where.lng }, ...PLACES]
      : PLACES;

  function resolveFields(next: Need, ...fields: string[]): Need {
    const confidence = { ...next.confidence };
    for (const field of fields) confidence[field] = 1;
    const missingFields = next.missingFields?.filter((field) => !fields.includes(field));
    return {
      ...next,
      confidence,
      missingFields: missingFields?.length ? missingFields : undefined,
    };
  }

  function updatePlace(label: string) {
    const selected = places.find((candidate) => candidate.label === label);
    if (selected) onChange(resolveFields({ ...need, where: selected }, 'where'));
  }

  const category = CATEGORIES.find((entry) => entry.value === need.category)?.label ?? need.what;
  const magnitudeLabel = need.magnitude
    ? `${need.magnitude.value} ${UNITS.find((unit) => unit.value === need.magnitude?.unit)?.label ?? need.magnitude.unit}`
    : undefined;
  const windowLabel = formatWindow(need);
  const missingWhere = !need.where?.label.trim();
  const missingWindow = !need.window?.from || !need.window.to;
  // Sin lugar no se inventa nada: el motor busca en todo el país. Sin fecha,
  // el backend ya completó un rango de un año al confirmar (ver
  // needs.service.ts) — acá solo se avisa que fue un valor por defecto.
  const windowIsDefaulted = !missingWindow && need.missingFields?.includes('window') === true;

  const warnings = [
    needsReview(need, 'category', 'what') ? 'Revisá el rubro' : null,
    needsReview(need, 'magnitude') ? 'Revisá la cantidad' : null,
    !missingWhere && needsReview(need, 'where', 'radiusKm') ? 'Revisá la ubicación' : null,
    windowIsDefaulted
      ? 'Fecha por defecto (próximo año): ajustala si hace falta'
      : !missingWindow && needsReview(need, 'window')
        ? 'Fecha deducida del texto'
        : null,
  ].filter((message): message is string => message !== null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
          &ldquo;{need.rawText}&rdquo;
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onEditQuery}>
          <PencilLine /> Editar consulta
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Pill icon={<Tractor />} label={need.what || category} warn={needsReview(need, 'category', 'what')}>
          <div className="flex flex-col gap-2">
            <Select
              value={need.category}
              onValueChange={(next) => onChange(resolveFields({ ...need, category: next as NeedCategory }, 'category'))}
            >
              <SelectTrigger aria-label="Categoría de la necesidad"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label="Qué necesitás"
              value={need.what}
              onChange={(event) => onChange(resolveFields({ ...need, what: event.target.value }, 'what'))}
            />
          </div>
        </Pill>

        <Pill icon={<Ruler />} label={magnitudeLabel ?? 'Cantidad: sin definir'} warn={needsReview(need, 'magnitude')}>
          <div className="grid grid-cols-[1fr_130px] gap-2">
            <Input
              aria-label="Cantidad"
              type="number"
              min="0"
              value={need.magnitude?.value ?? ''}
              placeholder="Sin definir"
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                const next = {
                  ...need,
                  magnitude: Number.isFinite(value) ? { value, unit: need.magnitude?.unit ?? 'UNIT' } : undefined,
                };
                onChange(Number.isFinite(value) ? resolveFields(next, 'magnitude') : next);
              }}
            />
            <Select
              value={need.magnitude?.unit ?? 'UNIT'}
              onValueChange={(unit) =>
                onChange(resolveFields({ ...need, magnitude: { value: need.magnitude?.value ?? 1, unit: unit as Unit } }, 'magnitude'))
              }
            >
              <SelectTrigger aria-label="Unidad"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Pill>

        <Pill
          icon={<MapPin />}
          label={place ? `${place}${need.radiusKm ? ` +${need.radiusKm} km` : ''}` : 'Todo el país'}
          warn={!missingWhere && needsReview(need, 'where', 'radiusKm')}
        >
          <div className="grid gap-2">
            <Select value={place || undefined} onValueChange={updatePlace}>
              <SelectTrigger aria-label="Ubicación"><SelectValue placeholder="Elegí una ubicación" /></SelectTrigger>
              <SelectContent>
                {places.map((candidate) => (
                  <SelectItem key={candidate.label} value={candidate.label}>{candidate.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label="Radio en kilómetros"
              type="number"
              min="1"
              value={need.radiusKm ?? ''}
              placeholder="Radio km"
              onChange={(event) => {
                const next = {
                  ...need,
                  radiusKm: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : undefined,
                };
                onChange(Number.isFinite(event.target.valueAsNumber) ? resolveFields(next, 'radiusKm') : next);
              }}
            />
          </div>
        </Pill>

        <Pill
          icon={<CalendarDays />}
          label={windowLabel ?? 'Buscando fecha…'}
          warn={windowIsDefaulted || (!missingWindow && needsReview(need, 'window'))}
        >
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="Fecha desde"
              type="date"
              value={need.window?.from ?? ''}
              onChange={(event) => {
                const window = { from: event.target.value, to: need.window?.to ?? '' };
                const next = { ...need, window };
                onChange(window.from && window.to ? resolveFields(next, 'window') : next);
              }}
            />
            <Input
              aria-label="Fecha hasta"
              type="date"
              value={need.window?.to ?? ''}
              onChange={(event) => {
                const window = { from: need.window?.from ?? '', to: event.target.value };
                const next = { ...need, window };
                onChange(window.from && window.to ? resolveFields(next, 'window') : next);
              }}
            />
          </div>
        </Pill>

        <Button type="button" size="sm" className="ml-auto" disabled={busy} onClick={onSearch}>
          {busy ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>

      {warnings.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {warnings.map((message) => (
            <Badge key={message} variant="warn">
              <AlertTriangle className="size-3" /> {message}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
