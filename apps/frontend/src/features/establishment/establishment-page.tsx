import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Search,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import type { Farm } from '@org/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorMessage } from '@/components/ui/error-message';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useMe } from '../../shared/api/hooks/use-me.js';
import { useActiveFarmId } from '../../shared/user/user-context.js';

interface EstablishmentProfile {
  legalName: string;
  cuit: string;
  renspa: string;
  productionType: string;
  surface: string;
  contactName: string;
  phone: string;
  email: string;
  requester: boolean;
  provider: boolean;
  requestedCategories: string[];
  offeredServices: string[];
  coverage: string;
  availability: string;
}

const MOCK_PROFILES: Record<string, EstablishmentProfile> = {
  'farm-a': {
    legalName: 'Tambo La Esperanza SRL',
    cuit: '30-71234567-8',
    renspa: '22.045.0.00234/01',
    productionType: 'Tambo y cabaña bovina',
    surface: '420 ha',
    contactName: 'Juan Bautista Fernández',
    phone: '+54 9 358 412-9084',
    email: 'juan@laesperanza.com.ar',
    requester: true,
    provider: true,
    requestedCategories: ['Maquinaria', 'Veterinaria', 'Genética'],
    offeredServices: ['Genética bovina', 'Venta de vaquillonas'],
    coverage: '120 km desde el establecimiento',
    availability: 'Lunes a viernes · 8 a 18 h',
  },
  'farm-b': {
    legalName: 'Productores del Litoral SA',
    cuit: '30-69843210-4',
    renspa: '82.014.0.01876/00',
    productionType: 'Producción lechera',
    surface: '310 ha',
    contactName: 'María Belén Acosta',
    phone: '+54 9 3492 551-230',
    email: 'maria@productoreslitoral.com.ar',
    requester: true,
    provider: false,
    requestedCategories: ['Maquinaria', 'Veterinaria', 'Insumos'],
    offeredServices: [],
    coverage: '',
    availability: '',
  },
  'farm-c': {
    legalName: 'Cabaña Los Aromos SAS',
    cuit: '30-71890432-1',
    renspa: '01.033.0.00451/02',
    productionType: 'Cabaña y genética bovina',
    surface: '580 ha',
    contactName: 'Santiago Molina',
    phone: '+54 9 2392 440-187',
    email: 'santiago@losaromos.com.ar',
    requester: false,
    provider: true,
    requestedCategories: [],
    offeredServices: ['Semen bovino', 'Asesoramiento genético'],
    coverage: 'Todo el país',
    availability: 'Lunes a sábado · con coordinación previa',
  },
};

const FALLBACK_PROFILE = MOCK_PROFILES['farm-a'];

function ProfileValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-3 uppercase">{label}</p>
      <p className={`mt-1 truncate text-[13px] font-semibold ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function RoleCard({
  checked,
  editing,
  icon,
  title,
  description,
  onCheckedChange,
}: {
  checked: boolean;
  editing: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={`flex min-h-28 items-start gap-3 rounded-md border p-4 transition-colors ${
        checked ? 'border-secondary-border bg-secondary/65' : 'border-border-soft bg-muted/45'
      }`}
    >
      <span className={`mt-0.5 rounded-full p-2 ${checked ? 'bg-primary text-primary-foreground' : 'bg-card text-ink-4'}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{title}</p>
          {editing ? (
            <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
          ) : checked ? (
            <CheckCircle2 className="size-4 text-primary" aria-label="Activo" />
          ) : null}
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-label="Cargando establecimiento">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

export function EstablishmentPage() {
  const { data, isLoading, isError, error } = useMe();
  const [activeFarmId] = useActiveFarmId();
  const farm = data?.farms.find((item) => item.id === activeFarmId) ?? data?.farms[0];

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorMessage message={(error as Error).message} />;
  if (!farm) return <ErrorMessage message="No encontramos un establecimiento asociado a esta cuenta." />;

  return <EstablishmentProfileView key={farm.id} farm={farm} />;
}

function EstablishmentProfileView({ farm }: { farm: Farm }) {
  const initialProfile = MOCK_PROFILES[farm.id] ?? FALLBACK_PROFILE;
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateDraft(field: keyof EstablishmentProfile, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startEditing() {
    setDraft(profile);
    setEditing(true);
    setSaved(false);
  }

  function cancelEditing() {
    setDraft(profile);
    setEditing(false);
  }

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfile(draft);
    setEditing(false);
    setSaved(true);
  }

  const visibleProfile = editing ? draft : profile;
  const participationLabel = [
    visibleProfile.requester ? 'Solicita soluciones' : null,
    visibleProfile.provider ? 'Provee servicios' : null,
  ].filter(Boolean).join(' · ') || 'Sin actividad definida';

  return (
    <form className="flex flex-col gap-5" onSubmit={saveProfile}>
      <PageHeader
        title="Mi establecimiento"
        description="La información que usamos para personalizar búsquedas, matches y oportunidades."
        actions={
          editing ? (
            <>
              <Button type="button" variant="ghost" onClick={cancelEditing}><X /> Cancelar</Button>
              <Button type="submit"><Check /> Guardar cambios</Button>
            </>
          ) : (
            <Button type="button" variant="secondary" onClick={startEditing}><Pencil /> Editar perfil</Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[21px] font-semibold tracking-[-0.025em]">{farm.name}</h2>
              <Badge variant="ok"><ShieldCheck /> Perfil verificado</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MapPin className="size-3.5" /> {farm.location}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleProfile.requester ? <Badge variant="solid"><Search /> Solicita</Badge> : null}
              {visibleProfile.provider ? <Badge variant="neutral"><Store /> Provee</Badge> : null}
            </div>
          </div>
          <div className="w-full rounded-md bg-muted px-4 py-3 sm:w-52">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span>Perfil completo</span><span>100%</span>
            </div>
            <Progress value={100} className="mt-2" />
            <p className="mt-2 text-[10.5px] text-muted-foreground">Todos los datos requeridos están cargados.</p>
          </div>
        </CardContent>
      </Card>

      {saved ? (
        <div className="flex items-center gap-2 rounded-md border border-secondary-border bg-secondary px-4 py-3 text-[12px] font-medium" role="status">
          <CheckCircle2 className="size-4" /> Los cambios se guardaron en esta vista demo.
        </div>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos generales</CardTitle>
              <CardDescription>Identificación productiva y fiscal del establecimiento.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {editing ? (
                <>
                  <Field label="Razón social" htmlFor="legalName" required>
                    <Input id="legalName" required value={draft.legalName} onChange={(event) => updateDraft('legalName', event.target.value)} />
                  </Field>
                  <Field label="CUIT" htmlFor="cuit" required>
                    <Input id="cuit" required value={draft.cuit} onChange={(event) => updateDraft('cuit', event.target.value)} />
                  </Field>
                  <Field label="RENSPA" htmlFor="renspa" required>
                    <Input id="renspa" required value={draft.renspa} onChange={(event) => updateDraft('renspa', event.target.value)} />
                  </Field>
                  <Field label="Actividad principal" htmlFor="productionType" required>
                    <Input id="productionType" required value={draft.productionType} onChange={(event) => updateDraft('productionType', event.target.value)} />
                  </Field>
                  <Field label="Superficie productiva" htmlFor="surface" required>
                    <Input id="surface" required value={draft.surface} onChange={(event) => updateDraft('surface', event.target.value)} />
                  </Field>
                  <Field label="Ubicación">
                    <Input disabled value={farm.location} />
                  </Field>
                </>
              ) : (
                <>
                  <ProfileValue label="Razón social" value={profile.legalName} />
                  <ProfileValue label="CUIT" value={profile.cuit} mono />
                  <ProfileValue label="RENSPA" value={profile.renspa} mono />
                  <ProfileValue label="Actividad principal" value={profile.productionType} />
                  <ProfileValue label="Superficie productiva" value={profile.surface} />
                  <ProfileValue label="Ubicación" value={farm.location} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cómo participás en AgroMatch</CardTitle>
              <CardDescription>Podés solicitar soluciones, ofrecer servicios o hacer ambas cosas.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <RoleCard
                checked={visibleProfile.requester}
                editing={editing}
                icon={<Search className="size-4" />}
                title="Solicito soluciones"
                description="Busco proveedores, servicios e insumos para las necesidades del establecimiento."
                onCheckedChange={(checked) => updateDraft('requester', checked)}
              />
              <RoleCard
                checked={visibleProfile.provider}
                editing={editing}
                icon={<Store className="size-4" />}
                title="Ofrezco productos o servicios"
                description="Publico mi oferta y recibo consultas de otros productores de la red."
                onCheckedChange={(checked) => updateDraft('provider', checked)}
              />
            </CardContent>
          </Card>

          {visibleProfile.requester ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Perfil solicitante</CardTitle>
                    <CardDescription className="mt-1">Preferencias usadas para acercarte oportunidades relevantes.</CardDescription>
                  </div>
                  <Badge variant="solid">Activo</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-3 uppercase">Categorías de interés</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleProfile.requestedCategories.map((category) => <Badge key={category} variant="neutral">{category}</Badge>)}
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12.5px] font-semibold">Zona de búsqueda</p>
                    <p className="text-[11.5px] text-muted-foreground">Ubicación del establecimiento + radio definido en cada búsqueda.</p>
                  </div>
                  <MapPin className="size-5 shrink-0 text-ink-3" />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {visibleProfile.provider ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Perfil proveedor</CardTitle>
                    <CardDescription className="mt-1">Datos visibles para quienes encuentren tus ofertas.</CardDescription>
                  </div>
                  <Badge variant="ok">Publicado</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-ink-3 uppercase">Servicios ofrecidos</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {visibleProfile.offeredServices.map((service) => <Badge key={service} variant="neutral">{service}</Badge>)}
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileValue label="Cobertura" value={visibleProfile.coverage} />
                  <ProfileValue label="Disponibilidad" value={visibleProfile.availability} />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Contacto principal</CardTitle>
              <CardDescription>Canal para solicitudes y oportunidades.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {editing ? (
                <>
                  <Field label="Nombre y apellido" htmlFor="contactName" required>
                    <Input id="contactName" required value={draft.contactName} onChange={(event) => updateDraft('contactName', event.target.value)} />
                  </Field>
                  <Field label="Teléfono" htmlFor="phone" required>
                    <Input id="phone" type="tel" required value={draft.phone} onChange={(event) => updateDraft('phone', event.target.value)} />
                  </Field>
                  <Field label="Correo electrónico" htmlFor="email" required>
                    <Input id="email" type="email" required value={draft.email} onChange={(event) => updateDraft('email', event.target.value)} />
                  </Field>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3"><UserRound className="size-4 text-ink-3" /><div><p className="text-[10.5px] text-muted-foreground">Responsable</p><p className="text-[12.5px] font-semibold">{profile.contactName}</p></div></div>
                  <div className="flex items-center gap-3"><Phone className="size-4 text-ink-3" /><div><p className="text-[10.5px] text-muted-foreground">Teléfono</p><p className="text-[12.5px] font-semibold">{profile.phone}</p></div></div>
                  <div className="flex items-center gap-3"><Mail className="size-4 text-ink-3" /><div className="min-w-0"><p className="text-[10.5px] text-muted-foreground">Correo</p><p className="truncate text-[12.5px] font-semibold">{profile.email}</p></div></div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del perfil</CardTitle>
              <CardDescription>{participationLabel}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                'Identidad del establecimiento',
                'Ubicación y datos productivos',
                'Contacto principal',
                'CUIT y RENSPA',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[11.5px]">
                  <CheckCircle2 className="size-4 text-primary" /> {item}
                </div>
              ))}
              <Separator />
              <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                Los campos marcados con * son obligatorios para guardar. Los datos de esta pantalla son mockeados.
              </p>
            </CardContent>
          </Card>

          <Card className="border-secondary-border bg-secondary/50">
            <CardContent className="flex gap-3 p-4">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[12px] font-semibold">Última actualización</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">12 de septiembre de 2026 · Datos de demostración</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}
