import type { Need, NeedCategory, Unit } from '@org/shared-types';
import { AlertTriangle, CalendarDays, MapPin, PencilLine, Tractor } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

function FieldRow({
  label,
  icon,
  warning,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  warning?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-border-soft px-4 py-4 last:border-0 sm:grid-cols-[132px_1fr] sm:items-start">
      <div className="flex items-center gap-2 pt-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        <span className="text-primary [&_svg]:size-3.5">{icon}</span>
        {label}
      </div>
      <div className="space-y-2">
        {children}
        {warning ? (
          <Badge variant="warn">
            <AlertTriangle className="size-3" /> {warning}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function needsReview(need: Need, ...fields: string[]): boolean {
  return fields.some(
    (field) =>
      need.missingFields?.includes(field) === true ||
      (need.confidence?.[field] !== undefined && (need.confidence[field] ?? 1) < 0.8),
  );
}

export function NeedInterpretation({
  need,
  onChange,
  onEditQuery,
  onConfirm,
  busy,
}: {
  need: Need;
  onChange: (need: Need) => void;
  onEditQuery: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const place = need.where?.label ?? '';
  // La IA devuelve el lugar tal como lo escribió el productor ("Río Cuarto"),
  // que rara vez coincide letra por letra con la lista fija. Si ya viene una
  // ubicación con coordenadas, se ofrece como opción: nunca se pierde lo que
  // el intake interpretó bien.
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
    if (selected) {
      onChange(resolveFields({ ...need, where: selected }, 'where'));
    }
  }

  const unresolved = [
    !need.where?.label.trim() ? 'where' : null,
    !need.window?.from || !need.window.to ? 'window' : null,
  ].filter((field): field is string => field !== null);
  const requiresPlaceAndWindow = need.category !== 'GENETICS';

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 py-6 sm:py-10">
      <Card className="flex items-center gap-3 px-4 py-3 shadow-sm">
        <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
          &ldquo;{need.rawText}&rdquo;
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onEditQuery}>
          <PencilLine /> Editar consulta
        </Button>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/35 py-3.5">
          <CardTitle>Lo que AgroMatch entendió</CardTitle>
        </CardHeader>

        <FieldRow label="Necesidad" icon={<Tractor />} warning={needsReview(need, 'category', 'what') ? 'Revisá este dato' : undefined}>
          <div className="grid gap-2 sm:grid-cols-[190px_1fr]">
            <Select
              value={need.category}
              onValueChange={(category) =>
                onChange(resolveFields({ ...need, category: category as NeedCategory }, 'category'))
              }
            >
              <SelectTrigger aria-label="Categoría de la necesidad"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label="Qué necesitás"
              value={need.what}
              onChange={(event) =>
                onChange(resolveFields({ ...need, what: event.target.value }, 'what'))
              }
            />
          </div>
        </FieldRow>

        <FieldRow label="Cantidad" icon={<PencilLine />} warning={needsReview(need, 'magnitude') ? 'Revisá este dato' : undefined}>
          <div className="grid grid-cols-[1fr_150px] gap-2">
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
                  magnitude: Number.isFinite(value)
                    ? { value, unit: need.magnitude?.unit ?? 'UNIT' }
                    : undefined,
                };
                onChange(Number.isFinite(value) ? resolveFields(next, 'magnitude') : next);
              }}
            />
            <Select
              value={need.magnitude?.unit ?? 'UNIT'}
              onValueChange={(unit) =>
                onChange(
                  resolveFields(
                    { ...need, magnitude: { value: need.magnitude?.value ?? 1, unit: unit as Unit } },
                    'magnitude',
                  ),
                )
              }
            >
              <SelectTrigger aria-label="Unidad"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNITS.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </FieldRow>

        <FieldRow label="Ubicación" icon={<MapPin />} warning={needsReview(need, 'where', 'radiusKm') ? 'Revisá este dato' : undefined}>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
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
        </FieldRow>

        <FieldRow label="Fecha sugerida" icon={<CalendarDays />} warning={needsReview(need, 'window') ? 'Fecha deducida del texto' : undefined}>
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
        </FieldRow>
      </Card>

      {unresolved.length > 0 ? (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertDescription>
            No completamos {unresolved.includes('where') ? 'el lugar' : ''}
            {unresolved.length === 2 ? ' ni ' : ''}
            {unresolved.includes('window') ? 'la fecha' : ''}. Ingresalos vos antes de buscar.
          </AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={busy || (requiresPlaceAndWindow && unresolved.length > 0)}
        onClick={onConfirm}
      >
        {busy
          ? 'Buscando soluciones…'
          : need.category === 'GENETICS'
            ? 'Ir al motor genético'
            : 'Confirmar y buscar soluciones'}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Tocá cualquier campo para corregirlo antes de buscar
      </p>
    </div>
  );
}
