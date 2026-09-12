import { useEffect, useState } from 'react';
import type { NeedCategory, PriceModel, ProviderType } from '@org/shared-types';
import { ExternalLink, Package, Pencil, Plus, ShieldQuestion, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { OfferCard } from '@/components/ui/offer-card';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VersionTag } from '@/components/ui/version-tag';
import { useUser } from '../../shared/user/user-context.js';

const CATEGORY_OPTIONS: Array<{ value: NeedCategory; label: string }> = [
  { value: 'MACHINERY', label: 'Servicio de maquinaria' },
  { value: 'VET', label: 'Veterinaria' },
  { value: 'INPUTS', label: 'Insumos' },
  { value: 'ADVISORY', label: 'Asesoramiento' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'FINANCE', label: 'Financiamiento' },
  { value: 'GENETICS', label: 'Genética' },
  { value: 'OTHER', label: 'Otra necesidad' },
];

const CATEGORY_LABEL: Record<NeedCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((entry) => [entry.value, entry.label]),
) as Record<NeedCategory, string>;

const PRICE_MODEL_OPTIONS: Array<{ value: PriceModel; label: string }> = [
  { value: 'QUOTE', label: 'A cotizar' },
  { value: 'PER_HA', label: 'Por hectárea' },
  { value: 'PER_HEAD', label: 'Por cabeza' },
  { value: 'PER_VISIT', label: 'Por visita' },
  { value: 'PER_UNIT', label: 'Por unidad' },
  { value: 'MONTHLY', label: 'Mensual' },
];

const PRICE_MODEL_LABEL: Record<PriceModel, string> = Object.fromEntries(
  PRICE_MODEL_OPTIONS.map((entry) => [entry.value, entry.label]),
) as Record<PriceModel, string>;

const PROVIDER_TYPE_OPTIONS: Array<{ value: ProviderType; label: string }> = [
  { value: 'CONTRACTOR', label: 'Contratista' },
  { value: 'VET', label: 'Veterinaria' },
  { value: 'DISTRIBUTOR', label: 'Distribuidor' },
  { value: 'SEMEN_COMPANY', label: 'Central de semen' },
  { value: 'ADVISOR', label: 'Asesor' },
  { value: 'OTHER', label: 'Otro' },
];

const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = Object.fromEntries(
  PROVIDER_TYPE_OPTIONS.map((entry) => [entry.value, entry.label]),
) as Record<ProviderType, string>;

interface ServiceDraft {
  id: string;
  category: NeedCategory;
  serviceType: string;
  coverageRadiusKm: number;
  priceModel: PriceModel;
  priceFrom: string;
  certifications: string;
  imageUrl: string;
}

const EMPTY_SERVICE_FORM: Omit<ServiceDraft, 'id'> = {
  category: 'MACHINERY',
  serviceType: '',
  coverageRadiusKm: 100,
  priceModel: 'QUOTE',
  priceFrom: '',
  certifications: '',
  imageUrl: '',
};

function newId(): string {
  return `draft-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Diseño de pantalla para "Mis ofertas" (nav.ts: `/ofertas`, todavía
 * `status: 'pending'`). A pedido explícito: front primero en base al
 * modelo real (`Provider`/`Capability` de shared-types), sin conectar
 * ningún hook de API — todo vive en estado local del componente y se
 * pierde al recargar. Cuando se conecte, el backend de ofertas reemplaza
 * este estado por `useProviderProfile`/`useMyCapabilities` reales.
 */
export function OffersPage() {
  const { user } = useUser();

  const [profile, setProfile] = useState({
    name: user.name,
    type: 'OTHER' as ProviderType,
    location: '',
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);

  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<ServiceDraft, 'id'>>(EMPTY_SERVICE_FORM);

  // Cada cuenta PROVIDER simulada es una ficha distinta: al cambiar de
  // usuario (selector del sidebar) arranca su propia vista previa en vez de
  // arrastrar el estado local de la cuenta anterior.
  useEffect(() => {
    setProfile({ name: user.name, type: 'OTHER', location: '' });
    setEditingProfile(false);
    setServices([]);
    setFormOpen(false);
    setEditingId(null);
  }, [user.id, user.name]);

  if (user.role !== 'PROVIDER') {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ShieldQuestion />}
          title="Esta pantalla es de una cuenta de proveedor"
          description="Tu catálogo de servicios se administra desde la cuenta de proveedor vinculada a tu ficha. Cambiá a una cuenta de tipo Proveedor desde el pie del sidebar para ver esta pantalla con tus propios datos."
        />
      </div>
    );
  }

  function openNewServiceForm() {
    setEditingId(null);
    setForm(EMPTY_SERVICE_FORM);
    setFormOpen(true);
  }

  function openEditServiceForm(service: ServiceDraft) {
    setEditingId(service.id);
    setForm({
      category: service.category,
      serviceType: service.serviceType,
      coverageRadiusKm: service.coverageRadiusKm,
      priceModel: service.priceModel,
      priceFrom: service.priceFrom,
      certifications: service.certifications,
      imageUrl: service.imageUrl,
    });
    setFormOpen(true);
  }

  function saveService(event: React.FormEvent) {
    event.preventDefault();
    const draft: ServiceDraft = { id: editingId ?? newId(), ...form };
    setServices((current) =>
      editingId ? current.map((service) => (service.id === editingId ? draft : service)) : [...current, draft],
    );
    setFormOpen(false);
  }

  function removeService(id: string) {
    setServices((current) => current.filter((service) => service.id !== id));
  }

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfile(profileDraft);
    setEditingProfile(false);
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <PageHeader
        title="Tu catálogo de servicios"
        description="Cargá lo que ofrecés para que el motor te tenga en cuenta cuando un productor busque tu categoría."
        actions={
          <Button type="button" onClick={openNewServiceForm}>
            <Plus /> Agregar servicio
          </Button>
        }
      />

      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-[11.5px] text-muted-foreground">
        <VersionTag>vista previa</VersionTag>
        Esta pantalla todavía no guarda nada en el servidor: es el diseño del flujo, antes de conectarla a una API real.
      </div>

      <Card className="flex flex-col gap-4 p-4">
        {editingProfile ? (
          <form onSubmit={saveProfile} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre del proveedor" required>
                <Input
                  value={profileDraft.name}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Tipo">
                <Select
                  value={profileDraft.type}
                  onValueChange={(value) => setProfileDraft((current) => ({ ...current, type: value as ProviderType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Ubicación base" hint="Ciudad y provincia, como la ven los productores">
              <Input
                value={profileDraft.location}
                onChange={(event) => setProfileDraft((current) => ({ ...current, location: event.target.value }))}
                placeholder="Ej: Villa María, Córdoba"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setProfileDraft(profile); setEditingProfile(false); }}>
                Cancelar
              </Button>
              <Button type="submit">Guardar perfil</Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[15.5px] font-bold tracking-tight">{profile.name}</p>
              <p className="text-[11.5px] text-muted-foreground">
                {PROVIDER_TYPE_LABEL[profile.type]}
                {profile.location ? ` · ${profile.location}` : ''}
              </p>
              <Badge variant="neutral" className="mt-1">No verificado · cuenta simulada</Badge>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setProfileDraft(profile); setEditingProfile(true); }}>
              <Pencil /> Editar perfil
            </Button>
          </div>
        )}
      </Card>

      {services.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="Todavía no cargaste servicios"
          description="Agregá el primero para ver cómo se vería tu ficha en las búsquedas del mercado."
          action={
            <Button type="button" onClick={openNewServiceForm}>
              <Plus /> Agregar servicio
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const certifications = service.certifications
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean);
            return (
              <OfferCard
                key={service.id}
                image={
                  service.imageUrl ? (
                    <img
                      src={service.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  ) : undefined
                }
                title={service.serviceType || CATEGORY_LABEL[service.category]}
                subtitle={CATEGORY_LABEL[service.category]}
                badges={
                  <>
                    <Badge variant="neutral">Sin publicar</Badge>
                    {certifications.map((tag) => (
                      <Badge key={tag} variant="ok">{tag}</Badge>
                    ))}
                  </>
                }
                stats={[
                  { label: 'Cobertura', value: `${service.coverageRadiusKm} km` },
                  { label: 'Modelo de precio', value: PRICE_MODEL_LABEL[service.priceModel] },
                ]}
                price={service.priceFrom ? `Desde $${service.priceFrom}` : 'A cotizar'}
                secondaryAction={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar ${service.serviceType || CATEGORY_LABEL[service.category]}`}
                    onClick={() => removeService(service.id)}
                  >
                    <Trash2 />
                  </Button>
                }
                primaryAction={
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => openEditServiceForm(service)}>
                    <Pencil /> Editar
                  </Button>
                }
              />
            );
          })}
        </div>
      )}

      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-[12.5px] font-semibold">¿Cómo se calcula el ranking?</p>
          <p className="text-[11.5px] text-muted-foreground">
            El motor no se compra: cercanía, disponibilidad, capacidad y precio deciden el orden. Nada de esto lo cambia tu plan.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <a href="/mercado" target="_blank" rel="noreferrer">
            Ver el mercado <ExternalLink />
          </a>
        </Button>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar servicio' : 'Agregar servicio'}</DialogTitle>
            <DialogDescription>Así lo va a ver un productor cuando busque en el mercado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveService} className="flex flex-col gap-3">
            <Field label="Categoría" required>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((current) => ({ ...current, category: value as NeedCategory }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Qué ofrecés" required hint="Ej: siembra directa, control reproductivo, semillas de soja">
              <Input
                value={form.serviceType}
                onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value }))}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Radio de cobertura (km)" required>
                <Input
                  type="number"
                  min="1"
                  value={form.coverageRadiusKm}
                  onChange={(event) => setForm((current) => ({ ...current, coverageRadiusKm: Number(event.target.value) }))}
                  required
                />
              </Field>
              <Field label="Modelo de precio">
                <Select
                  value={form.priceModel}
                  onValueChange={(value) => setForm((current) => ({ ...current, priceModel: value as PriceModel }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICE_MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {form.priceModel !== 'QUOTE' && (
              <Field label="Precio desde" hint="Opcional">
                <Input
                  type="number"
                  min="0"
                  value={form.priceFrom}
                  onChange={(event) => setForm((current) => ({ ...current, priceFrom: event.target.value }))}
                />
              </Field>
            )}

            <Field label="Certificaciones" hint="Separadas por coma. Opcional">
              <Input
                value={form.certifications}
                onChange={(event) => setForm((current) => ({ ...current, certifications: event.target.value }))}
                placeholder="SENASA, ISO 9001"
              />
            </Field>

            <Field label="Imagen (URL)" hint="Opcional — sin foto real, se muestra sin imagen en vez de inventar una">
              <Input
                value={form.imageUrl}
                onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="https://..."
              />
            </Field>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit">{editingId ? 'Guardar cambios' : 'Agregar servicio'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
