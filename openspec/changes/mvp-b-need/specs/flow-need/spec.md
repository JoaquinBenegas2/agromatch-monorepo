# flow-need — Necesidad → proveedores

**Dueño:** Dev B.
**Prioridad:** P0 (M4, M5, M6) · P1 (M7, anexo del asesor).
**Tareas del plan:** M4, M5, M6, M7 + anexo B6 + D6.
**Depende de:** `mvp-0-foundation` (dura). `mvp-a-core` M2 (blanda, stub hasta I2). `mvp-c-herd` B2/B3 solo para el anexo (blanda).
**Fuente visual (manda sobre `pantallas.md §3.1` donde difieren):** `AgroMatch Home Conversacional.dc.html` y `designs/01-sidebar-scaffolding.html` (PR #11), con el mapa de navegación de `mvp-0-foundation/specs/frontend-shell`.

## Purpose

Convierte un texto en lenguaje natural en una necesidad estructurada que el productor confirma, la matchea contra las capacidades de los proveedores con el motor determinístico, muestra el ranking con sus motivos y sus excluidos, y permite pedir el servicio — revelando el contacto recién ahí. Si la necesidad es genética, la deriva al vertical.

## Alcance

**Entra**
- **M4 · Intake con IA:** `NeedIntakePort` real en `packages/ai/src/need-intake.ts`, sobre `LlmClient.completeJson` con `NeedSchema` (o un esquema de salida más chico que se proyecta a `Need`). Devuelve siempre `status: 'DRAFT'`, con `confidence` por campo y `missingFields`.
- **M5 · API del núcleo:** módulos `needs/`, `providers/`, `matching/`, `requests/` en `apps/backend`, con las rutas de la tabla *Contratos*. `POST /needs/:id/matches` llama a `matchNeed` de `@org/matching-core` con los verticales registrados.
- **M6 · Pantalla "Home marketplace general"** en `features/market/`, ruta `/mercado`, tab única del módulo **Mercado y oportunidades**. Tres estados del mockup (cero → ficha de interpretación → resultados), más los cuatro estados obligatorios y handlers MSW propios.
- **M7 · Proveedores semilla reales:** `fixtures/providers.json` con ~30 proveedores públicos de `MACHINERY` y `VET`, más las centrales de semen de `bulls.seed.json` como proveedores `SEMEN_COMPANY` de `GENETICS`. Todos `verified: false` con `source`.
- **Anexo reasignable:** panel del asesor (ver sección final).

**Queda afuera**
- El algoritmo de matching (`hardFilters`, `scoreCandidate`, `matchNeed`): es de `mvp-a-core` (M2). B trabaja contra el stub de T0 hasta I2.
- Pagos, contratos, escrow, seguros, logística, chat interno, facturación (N8).
- Alta de proveedor, pantalla del proveedor, verificación real (`pantallas.md` §5; baseline §1b paso 7 es hoja de ruta).
- Login (D4).
- Categoría `INPUTS` (N3): el intake puede clasificarla, pero no hay proveedores semilla y la pantalla muestra "sin proveedores" con honestidad.
- Entrada por audio o WhatsApp (modelo de dominio §11): el ícono de micrófono del mockup queda como afordancia visual deshabilitada.
- Las tabs "Mis matches / mensajes" y "Cargar lotes / servicios" del sidebar: son placeholders "pendiente" de `frontend-shell` (N8, hoja de ruta).
- Un explicador genérico con IA para los candidatos no genéticos: ver *Preguntas abiertas* Q1.

## Contratos

Todo lo que sigue parte de `mvp-0-foundation/specs/shared-contracts`. Esta spec corrige un defecto aditivo descubierto al implementar RN-30: `where` y `window` deben ser opcionales para un `DRAFT`, y la confirmación en la API es la que exige su presencia antes de pasar a `OPEN`.

### Consume de `marketplace.ts`

```ts
export type NeedCategory =
  | 'MACHINERY' | 'VET' | 'INPUTS' | 'ADVISORY' | 'SOFTWARE' | 'FINANCE' | 'GENETICS' | 'OTHER';

export interface GeoPoint { lat: number; lng: number; label: string }
export interface TimeWindow { from: string; to: string }            // ISO
export type Unit = 'HA' | 'HEAD' | 'TON' | 'UNIT' | 'VISIT';
export interface Magnitude { value: number; unit: Unit }

export type NeedStatus = 'DRAFT' | 'OPEN' | 'MATCHED' | 'CLOSED';
export interface Need {
  id: string;
  farmId: string;
  rawText: string;                       // siempre se guarda (RN-39)
  category: NeedCategory;
  what: string;                          // "arar", "control reproductivo", "urea"
  where?: GeoPoint;                      // obligatorio desde OPEN
  radiusKm?: number;                     // modelo de dominio §5
  window?: TimeWindow;                   // obligatorio desde OPEN
  magnitude?: Magnitude;
  constraints: string[];                 // "con GPS", "matriculado", "factura A"
  budget?: number;
  status: NeedStatus;
  goal?: BreedingGoal;                   // solo en GENETICS
  createdAt: string;                     // ISO (modelo de dominio §5)
  /** Campos que el intake no pudo completar; presentes solo en DRAFT (M4). */
  missingFields?: Array<keyof Need>;
  /** Confianza 0..1 por campo interpretado (M4). */
  confidence?: Partial<Record<keyof Need, number>>;
}

export type PriceModel = 'PER_HA' | 'PER_HEAD' | 'PER_VISIT' | 'PER_UNIT' | 'MONTHLY' | 'QUOTE';
export type ProviderType = 'CONTRACTOR' | 'VET' | 'DISTRIBUTOR' | 'SEMEN_COMPANY' | 'ADVISOR' | 'OTHER';
export interface Provider {
  id: string; name: string; type: ProviderType;
  base: GeoPoint;
  verified: boolean;                     // RN-37: false = cargado de fuente pública
  reputation: { avg: number | null; jobs: number };
  contact: { phone?: string; email?: string }; // solo se expone dentro de ServiceRequest (RN-36)
  source: string;
}
export interface Capability {
  id: string; providerId: string;        // en GENETICS: id = bull.naab (ADR-0002)
  category: NeedCategory;
  serviceType: string;                   // "arada", "cosecha", "reproducción", "semen"
  coverageRadiusKm: number;
  capacityPerDay?: Magnitude;
  availability: TimeWindow[];
  priceModel: PriceModel;
  priceFrom?: number;
  certifications: string[];
  attributes: Record<string, string | number | boolean>;
}

export interface FitBreakdown {
  proximity: number; availability: number; capacity: number;
  price: number; reputation: number; vertical?: number;   // 0..1 cada uno
}
export interface MatchCandidate {
  needId: string; capabilityId: string; providerId: string;
  score: number; compatibility: number; rank: number;     // RN-32, RN-33
  fit: FitBreakdown;
  filters: FilterResult[];                                // RN-31
  verticalFacts?: unknown;                                // ExplanationFacts en GENETICS (RN-35)
  reasons: string[];
  explanation?: Explanation;
}
export interface MatchBoard { ranked: MatchCandidate[]; excluded: MatchCandidate[] }

export type ServiceRequestStatus = 'SENT' | 'ANSWERED' | 'ACCEPTED' | 'DONE' | 'CANCELLED';
export interface ServiceRequest {
  id: string; needId: string; providerId: string;
  message: string;
  status: ServiceRequestStatus;
  createdAt: string;
  contact: Provider['contact'];          // RN-36: acá y solo acá
}
export interface Review {
  id: string; serviceRequestId: string; providerId: string;
  rating: number; comment: string;
  createdAt: string;                     // modelo de dominio §5
}

/** Puerto de intake (RN-30). */
export interface NeedIntakePort { parse(rawText: string, farmId: string): Promise<Need> }
```

### Consume de `matching-core` (stub hasta I2)

```ts
export function matchNeed(need: Need, caps: Capability[], provs: Provider[], verticals: VerticalEngine[], ctx?: unknown): MatchBoard; // M2
export function listVerticals(): VerticalEngine[];                                                                    // M2
```

### Consume de `api.ts` — rutas de este flujo (prefijo `/api`, header `x-user-id`)

| Método y ruta | Body | Respuesta | Códigos de error propios |
|---|---|---|---|
| `POST /needs` | `{ rawText: string; farmId: string }` | `Need` (status `DRAFT`) | 502 `LLM_*` si el intake falla |
| `PATCH /needs/:id` | `Partial<Need>` + `{ confirm?: true }` | `Need` (`DRAFT`, o `OPEN` si confirma) | 404 `NEED_NOT_FOUND` · 409 `NEED_INCOMPLETE` (falta `where` o `window`) |
| `GET /needs` | `?farmId=` | `Need[]` (nunca los `Need` sintéticos de genética) | — |
| `POST /needs/:id/matches` | — | `MatchBoard` | 409 `NEED_NOT_CONFIRMED` si sigue en `DRAFT` |
| `GET /providers` | `?category=` | `Provider[]` (sin `contact`) | — |
| `POST /needs/:id/requests` | `{ providerId: string; message: string }` | `ServiceRequest` (con `contact`) | 404 `PROVIDER_NOT_FOUND` · 409 `NEED_NOT_CONFIRMED` |
| `POST /requests/:id/review` | `{ rating: number; comment: string }` | `Review` | 404 `REQUEST_NOT_FOUND` · 400 `VALIDATION_ERROR` (rating fuera de 1..5) |
| `GET /advisor/overview` | — | `FarmSummary[]` | 403 `ROLE_FORBIDDEN` |

```ts
export interface FarmSummary {
  farm: Farm;
  total: number;
  byTier: Record<Tier, number>;
  avgTraits: Partial<TraitVector>;
  a2a2Share: number;  // 0..1
  bbShare: number;    // 0..1
}
```

### Produce

- `NeedIntakePort` real (`packages/ai/src/need-intake.ts`), registrado en `ai.providers.ts` bajo `NEED_INTAKE_PORT`.
- Corrección aditiva de `NeedSchema`, `UpdateNeedBodySchema` y persistencia Prisma para representar borradores sin `where`/`window`.
- Los 7 endpoints del núcleo + `GET /advisor/overview`.
- `features/market/` (ruta `/mercado`) y `features/advisor/` (ruta `/motor-genetico/asesor`) con sus handlers MSW. Las rutas y las barras de tabs las provee `frontend-shell`.
- `fixtures/providers.json` (M7).

## ADDED Requirements

### Requirement: REQ-B-01 El intake estructura sin inventar
`NeedIntakePort.parse(rawText, farmId)` SHALL devolver una `Need` con `status: 'DRAFT'`, `rawText` igual al texto recibido, `farmId` recibido, `createdAt` y una `confidence` entre 0 y 1 por cada campo interpretado. Cuando el texto no dice **dónde** o **cuándo**, el intake SHALL listar ese campo en `missingFields` y SHALL no completarlo con un valor deducido. Los números y unidades del texto SHALL entrar tal cual en `magnitude`.

#### Scenario: Necesidad de maquinaria completa
- **WHEN** se llama `parse("necesito quien me are 40 ha en Río Cuarto la semana que viene", 'farm-a')`
- **THEN** devuelve `category: 'MACHINERY'`, `what: 'arada'`, `magnitude: { value: 40, unit: 'HA' }`, `where.label` que contiene "Río Cuarto" con `lat`/`lng` de esa localidad, una `window` de 7 días que arranca dentro de los próximos 7 días, `status: 'DRAFT'` y `missingFields` vacío o ausente

#### Scenario: Necesidad genética
- **WHEN** se llama `parse("el toro de mi vecino le anda bien a las vaquillonas, quiero mejorar sólidos", 'farm-a')`
- **THEN** devuelve `category: 'GENETICS'` y `goal` con `preset: 'SOLIDS_CHEESE'` o pesos donde `fat` y `pro` dominan; `where` y `window` pueden faltar sin que sea un error

#### Scenario: Texto ambiguo
- **WHEN** se llama `parse("necesito un veterinario", 'farm-a')`
- **THEN** devuelve `category: 'VET'`, `status: 'DRAFT'`, `missingFields` que incluye `where` y `window`, y ningún valor de fecha ni de lugar inventado

#### Scenario: El LLM devuelve un JSON inválido
- **WHEN** `LlmClient.completeJson` lanza `LlmSchemaMismatchError`
- **THEN** el intake no la traga: la deja subir y la API responde 502 `LLM_SCHEMA_MISMATCH` con `message` en español

### Requirement: REQ-B-02 Nada se busca hasta que el productor confirma
`POST /needs` SHALL crear la `Need` en `DRAFT` y SHALL no ejecutar ningún matching. `PATCH /needs/:id` con `confirm: true` SHALL aplicar las correcciones del productor, SHALL validar que `where` y `window` estén completos, y SHALL pasar la necesidad a `OPEN`. `POST /needs/:id/matches` sobre una necesidad en `DRAFT` SHALL responder 409.

#### Scenario: Crear y confirmar
- **WHEN** `tambero-a` hace `POST /needs { rawText, farmId: 'farm-a' }` y después `PATCH /needs/:id { where: {...}, confirm: true }`
- **THEN** la primera respuesta es `DRAFT`, la segunda es `OPEN` con el `where` corregido y `rawText` intacto

#### Scenario: Confirmar sin lugar
- **WHEN** se hace `PATCH /needs/:id { confirm: true }` y la necesidad no tiene `where`
- **THEN** responde 409 `NEED_INCOMPLETE` con `details.missingFields: ['where']` y la necesidad sigue en `DRAFT`

#### Scenario: Matchear un borrador
- **WHEN** se hace `POST /needs/:id/matches` con la necesidad en `DRAFT`
- **THEN** responde 409 `NEED_NOT_CONFIRMED`

### Requirement: REQ-B-03 El matching devuelve rankeados y excluidos con motivo
`POST /needs/:id/matches` sobre una necesidad `OPEN` SHALL cargar las capacidades y proveedores de la categoría de la necesidad, SHALL llamar a `matchNeed(need, caps, provs, listVerticals())` y SHALL devolver el `MatchBoard` resultante. Cada candidato de `excluded` SHALL traer al menos un `FilterResult` con `passed: false` y un `detail` legible. La necesidad SHALL pasar a `MATCHED`.

#### Scenario: Ranking de contratistas
- **WHEN** se matchea la necesidad de arada de 40 ha en Río Cuarto con los proveedores semilla
- **THEN** `ranked` viene ordenado por `rank` 1..n sin huecos, el #1 tiene `compatibility: 100`, todos tienen `fit` con los cinco componentes entre 0 y 1, y `excluded` trae los que no cubren la zona o la ventana con su `detail`

#### Scenario: Pasa por el núcleo, no por un atajo
- **WHEN** se inspecciona el servicio de `matching/`
- **THEN** la única forma de obtener un `MatchBoard` es llamar a `matchNeed` de `@org/matching-core`; no hay ordenamiento propio en la API

### Requirement: REQ-B-04 El contacto del proveedor solo aparece en la solicitud
`GET /providers` y los candidatos del `MatchBoard` SHALL no incluir `contact`. `POST /needs/:id/requests` SHALL crear la `ServiceRequest` en `SENT` y SHALL devolverla con el `contact` del proveedor.

#### Scenario: Lista sin contacto
- **WHEN** se pide `GET /providers?category=MACHINERY`
- **THEN** ningún elemento tiene la clave `contact`

#### Scenario: Solicitar revela el contacto
- **WHEN** se hace `POST /needs/:id/requests { providerId, message }` sobre una necesidad `OPEN` o `MATCHED`
- **THEN** responde 201 con `status: 'SENT'`, `createdAt` y `contact` con al menos `phone` o `email`

### Requirement: REQ-B-05 Valoración después del trabajo
`POST /requests/:id/review` SHALL crear una `Review` con `rating` entre 1 y 5 y SHALL actualizar `reputation` del proveedor (`avg` recalculado, `jobs + 1`).

#### Scenario: Primera valoración de un proveedor semilla
- **WHEN** un proveedor con `reputation: { avg: null, jobs: 0 }` recibe una review con `rating: 4`
- **THEN** `GET /providers` muestra `reputation: { avg: 4, jobs: 1 }` para ese proveedor

### Requirement: REQ-B-06 Aislamiento y trazabilidad de las necesidades
Toda ruta de este flujo SHALL rechazar con 403 `FARM_FORBIDDEN` una necesidad cuyo `farmId` no pertenece al usuario (RN-38). `GET /needs?farmId=` SHALL devolver solo las necesidades creadas por el productor y SHALL excluir las `Need` sintéticas de categoría `GENETICS` que arma el swipe (ADR-0002), identificadas por el aditivo `synthetic: true` que `NeedRepo.listByFarm` filtra por defecto (ver Q6). Toda `Need` SHALL conservar `rawText` y los `reasons` de cada candidato del último matching (RN-39).

#### Scenario: Necesidad ajena
- **WHEN** `tambero-b` hace `POST /needs/:id/matches` sobre una necesidad de `farm-a`
- **THEN** responde 403 `FARM_FORBIDDEN`

#### Scenario: El swipe no ensucia la lista
- **WHEN** `tambero-a` abrió el swipe de tres hembras (que crea tres `Need` sintéticas) y después pide `GET /needs?farmId=farm-a`
- **THEN** ninguna de las tres aparece; solo las necesidades que escribió

### Requirement: REQ-B-07 La pantalla interpreta, deja corregir y recién después busca
La ruta `/mercado` SHALL tener tres estados en la misma pantalla, como el mockup. **Estado 1 · cero:** el saludo "Hora de empezar, {nombre}" con el `user.name` de `GET /me`, el título "¿Qué necesita tu establecimiento hoy?", una sola caja centrada con el placeholder "Preguntale a AgroMatch o dictá tu necesidad…", un ícono de micrófono deshabilitado (tooltip "audio: hoja de ruta"), el botón primario "Preguntar" y los chips de ejemplo del MVP: "Contratistas de arada cerca tuyo", "Veterinario para el rodeo", "Quiero mejorar los sólidos de mi tambo". **Estado 2 · ficha de interpretación:** el `rawText` en una tarjeta con "Editar consulta", y la tarjeta "Lo que AgroMatch entendió" con las filas Necesidad (`category · what`, acción "cambiar"), Cantidad (`magnitude`, "editar"), Ubicación (`where.label` + `+{radiusKm} km`, "mapa" solo visual) y Fecha sugerida (`window.from – window.to`, "calendario"); cada fila SHALL ser editable inline; las filas con `confidence < 0.8` o presentes en `missingFields` SHALL resaltarse con `Badge variant="warn"`; abajo, el botón primario de ancho completo "Confirmar y buscar soluciones" y la leyenda "Tocá cualquier campo para corregirlo antes de buscar". Nada SHALL buscarse antes de confirmar. Corregir un campo y volver a confirmar SHALL producir un nuevo matching.

#### Scenario: Estado cero con el nombre del usuario
- **WHEN** `tambero-a` entra a `/mercado` sin haber escrito nada
- **THEN** ve el saludo con su nombre, el título, la caja con el placeholder, el micrófono deshabilitado, "Preguntar" y los tres chips; no hay ninguna llamada a `POST /needs` todavía

#### Scenario: Ficha con campo dudoso
- **WHEN** el intake devuelve `confidence.window: 0.5`
- **THEN** la fila "Fecha sugerida" muestra la ventana con un `Badge variant="warn"` que dice que la fecha se dedujo del texto, y la fila es editable inline

#### Scenario: Corregir y volver a buscar
- **WHEN** el productor cambia la ubicación en la ficha y aprieta "Confirmar y buscar soluciones" de nuevo
- **THEN** se envía un `PATCH /needs/:id` con el nuevo `where` y un nuevo `POST /needs/:id/matches`, y los resultados se reemplazan

#### Scenario: Editar consulta vuelve al texto
- **WHEN** en el estado 2 el productor aprieta "Editar consulta"
- **THEN** vuelve a la caja del estado 1 con el `rawText` cargado; la `Need` en `DRAFT` se reemplaza al volver a preguntar

### Requirement: REQ-B-08 Los resultados muestran el ranking honesto
**Estado 3 · resultados:** arriba, la barra resumen de la búsqueda ("Arada · 40 ha · Río Cuarto +50 km · 22/11 – 28/11") con "Editar búsqueda", que vuelve al estado 2. Debajo, los chips de orden "Cercanía y disponibilidad" (default), "Mejor reputación" y "Menor precio/ha": SHALL ser reordenamientos **de vista, en el cliente**, sobre `MatchBoard.ranked`; el orden por defecto SHALL ser el del motor. Cada candidato SHALL mostrarse con `OfferCard` en una grilla de tres columnas: imagen placeholder con la distancia en km como badge, nombre, `serviceType · base.label`, filas Disponibilidad (inicio de la primera ventana que se superpone) y Reputación (`avg · jobs`, por ejemplo "4,9 · 62", o "sin valoraciones" si `avg` es `null`), precio (`priceFrom` con la unidad de `priceModel`, por ejemplo "US$ 64 /ha", o "a cotizar" si `QUOTE`), y el botón "Pedir fecha" (primario en el #1 del motor, secundario en el resto). **Obligatorio aunque el mockup no lo dibuje**, porque son reglas de nivel superior: el `rank` del motor como "#N de M" en toda tarjeta, en cualquier orden de vista (nunca un porcentaje suelto ni la palabra probabilidad); `VerificationBadge` según `verified`; la etiqueta "Semilla" en un proveedor semilla; `AiExplanation` con `source` visible; y un toggle o `Tabs` "Excluidos (N)" con el `detail` del filtro que sacó a cada uno.

#### Scenario: Tarjeta del #1
- **WHEN** se renderiza el primer candidato de un `MatchBoard` de 8 rankeados
- **THEN** la tarjeta dice "#1 de 8", muestra la distancia, disponibilidad, reputación y precio, `VerificationBadge status="unverified"` si `verified: false`, `AiExplanation` con `source="AI"` o `"FALLBACK"` siempre visible, y el botón "Pedir fecha" primario

#### Scenario: Reordenar por precio no cambia el ranking
- **WHEN** el productor elige el chip "Menor precio/ha"
- **THEN** las tarjetas se reordenan por `priceFrom` ascendente en el cliente, sin nueva llamada a la API, y cada tarjeta sigue mostrando su "#N de M" original del motor

#### Scenario: Excluidos visibles
- **WHEN** el `MatchBoard` trae 4 excluidos
- **THEN** el toggle dice "Excluidos (4)" y cada uno muestra su motivo ("está a 180 km y cubre 120", "no tiene la ventana libre"), nunca se ocultan

#### Scenario: Editar búsqueda
- **WHEN** el productor aprieta "Editar búsqueda" en la barra resumen
- **THEN** vuelve al estado 2 con la ficha cargada, sin perder el `rawText`

### Requirement: REQ-B-09 Pedir fecha revela el contacto en la pantalla
El botón "Pedir fecha" de una tarjeta SHALL crear la `ServiceRequest` y SHALL mostrar el contacto devuelto (teléfono o email) recién después de la respuesta. Antes de pedir, la tarjeta SHALL no mostrar ningún dato de contacto.

#### Scenario: Flujo de solicitud
- **WHEN** el productor aprieta "Pedir fecha" en la tarjeta del #1 y escribe un mensaje
- **THEN** se hace `POST /needs/:id/requests`, la tarjeta pasa a "Solicitud enviada" y muestra el `contact` que vino en la respuesta

### Requirement: REQ-B-10 Una necesidad genética lleva al vertical
Cuando la ficha del estado 2 tiene `category: 'GENETICS'`, el botón "Confirmar y buscar soluciones" SHALL decir "Ir al motor genético" y SHALL navegar a `/motor-genetico/matching` (con el `goal` interpretado si existe) en lugar de mostrar la grilla de proveedores.

#### Scenario: Tercera necesidad de la demo
- **WHEN** el productor escribe "quiero mejorar los sólidos de mi tambo" y confirma
- **THEN** la ficha dice "Genética" y el botón "Ir al motor genético" lleva a `/motor-genetico/matching`, sin llamar a `POST /needs/:id/matches`

### Requirement: REQ-B-11 La pantalla funciona completa con mocks
Con `VITE_MOCKS=true`, el recorrido intake → ficha → resultados → solicitud SHALL funcionar sin la API levantada, usando `needs.samples.json` y `samples/match-board-machinery.json`. La pantalla SHALL tener los cuatro estados obligatorios.

#### Scenario: Recorrido sin backend
- **WHEN** se elige el chip "Contratistas de arada cerca tuyo" con mocks activos
- **THEN** aparece la ficha, se confirma, aparecen la barra resumen, la grilla y los excluidos, y "Pedir fecha" muestra un contacto del fixture

#### Scenario: Categoría sin proveedores
- **WHEN** el matching devuelve `ranked: []` y `excluded: []`
- **THEN** la pantalla muestra un `EmptyState` que dice que no hay proveedores cargados para esa categoría, no un error

### Requirement: REQ-B-12 Proveedores semilla reales, públicos y marcados
`fixtures/providers.json` SHALL contener al menos 25 proveedores de fuentes públicas de `MACHINERY` y `VET`, más un proveedor `SEMEN_COMPANY` de `GENETICS` por cada central que aparece en `bulls.seed.json`. Cada uno SHALL validar contra `ProviderSchema` y `CapabilitySchema`, SHALL tener `verified: false`, `source` con la fuente citada, y el conjunto SHALL cubrir al menos dos zonas geográficas distintas.

#### Scenario: Validación del fixture
- **WHEN** corre el test de `shared-types` que parsea `providers.json`
- **THEN** todos los proveedores y capacidades validan, ninguno tiene `verified: true`, ninguno tiene `source` vacío

#### Scenario: El filtro de cobertura se nota
- **WHEN** se matchea una necesidad en Río Cuarto
- **THEN** al menos un proveedor de otra zona queda en `excluded` por cobertura

**— Anexo reasignable: Panel del asesor —**

### Requirement: REQ-B-ADV-01 Resumen por tambo para el asesor
`GET /advisor/overview` SHALL devolver un `FarmSummary` por cada tambo en `user.farmIds`, calculado desde las hembras y las clasificaciones guardadas. Si un tambo no está clasificado, `byTier` SHALL venir con ceros y `total` con las hembras con perfil. Un usuario `FARMER` SHALL recibir 403 `ROLE_FORBIDDEN`.

#### Scenario: El asesor ve sus tres tambos
- **WHEN** `asesor-1` pide `GET /advisor/overview`
- **THEN** recibe 3 resúmenes, y el de `farm-a` tiene `a2a2Share` entre 0.48 y 0.52 y `total: 293`

#### Scenario: Un tambero no es asesor
- **WHEN** `tambero-a` pide `GET /advisor/overview`
- **THEN** responde 403 `ROLE_FORBIDDEN`

### Requirement: REQ-B-ADV-02 Pantalla del panel del asesor
La tab "Panel del asesor" del módulo Motor genético (ruta `/motor-genetico/asesor`) SHALL mostrar una `Card` por tambo con `StatCard` para la distribución por tier, el % de A2/A2 y el % de BB, y un gráfico comparativo de `avgTraits` entre tambos. La tab SHALL renderizarse solo para `ADVISOR` y `ADMIN` (lo garantiza `frontend-shell` REQ-FS-03). SHALL tener los cuatro estados obligatorios.

#### Scenario: Panel con mocks
- **WHEN** `asesor-1` entra a la tab "Panel del asesor" con `VITE_MOCKS=true`
- **THEN** ve tres tarjetas con los datos de `samples/farm-summaries.json` y un gráfico que compara los tres tambos, con la tab activa en la barra del módulo

## Reglas que respeta

- **RN-30** (el usuario confirma antes de buscar: REQ-B-02, REQ-B-07) · **RN-31** (filtros duros con motivo: REQ-B-03, REQ-B-08) · **RN-32** y **RN-33** (score determinístico y compatibilidad como ranking: REQ-B-03, REQ-B-08) · **RN-34** (neutralidad: la API no reordena; REQ-B-03) · **RN-35** y **ADR-0002** (`matchNeed` con verticales registrados; `GENETICS` deriva al swipe: REQ-B-03, REQ-B-10; las `Need` sintéticas no se listan: REQ-B-06) · **RN-36** (contacto solo en la solicitud: REQ-B-04, REQ-B-09) · **RN-37** (semilla no verificada, se muestra: REQ-B-08, REQ-B-12) · **RN-38** (aislamiento: REQ-B-06, REQ-B-ADV-01) · **RN-39** (`rawText` y `reasons`: REQ-B-06).
- **RN-17** y **RN-18** (la IA no calcula; la explicación lleva indicador: REQ-B-08 y Q1) · **RN-19** y **RN-20** (lenguaje natural → estructura, el usuario ajusta: REQ-B-01, REQ-B-07).
- **N3** (solo maquinaria, veterinaria, genética en la semilla: REQ-B-12) · **N4** (sin comisión: no hay pago en el flujo) · **N6** (el ranking no se vende) · **N7** (tres niveles, el no verificado se ve) · **N8** (sin pagos ni contratos).
- Convenciones §1 (sin tests en API y front: verificación manual), §3, §5, §7, §8.
- **Fuente visual:** `AgroMatch Home Conversacional.dc.html` (los tres estados, la ficha, la grilla, los chips de orden, "Pedir fecha") y `designs/01-sidebar-scaffolding.html` (módulo "Mercado y oportunidades", tab "Home marketplace general"). Donde `pantallas.md §3.1` difiere (grupo "Necesidad" del sidebar, `Textarea`, "Buscar proveedores", "Solicitar"), manda el mockup. Lo que el mockup omite y las reglas exigen (ranking "#N de M", badge de verificación, explicación con indicador, excluidos) se agrega igual: `pantallas.md §4`, reglas visuales 1 a 4.

## Criterios de aceptación

Los de `packages/ai` (M4) se verifican a mano contra Claude en vivo; los de API y front son **verificación manual** (convenciones §1). **Cada PR dice en la descripción cómo se verificó**, con captura si aplica.

**M4 · Intake**
- [ ] `AI_MODE=live`: "necesito quien me are 40 ha en Río Cuarto la semana que viene" → `MACHINERY`, `what: 'arada'`, `40 HA`, ventana de 7 días, geo de Río Cuarto.
- [ ] "el toro de mi vecino le anda bien a las vaquillonas, quiero mejorar sólidos" → `GENETICS` con objetivo de sólidos.
- [ ] "necesito un veterinario" → `DRAFT` con `missingFields` que incluye `where` y `window`, sin fecha ni lugar inventados.

**M5 · API** (curl con `-H 'x-user-id: tambero-a'`)
- [ ] `POST /api/needs` → 201 `DRAFT`; `PATCH /api/needs/:id {confirm:true}` → `OPEN`; `POST /api/needs/:id/matches` → `MatchBoard` con `ranked[0].compatibility === 100`.
- [ ] `PATCH` sin `where` → 409 `NEED_INCOMPLETE`.
- [ ] `GET /api/providers` → ningún `contact`; `POST /api/needs/:id/requests` → `contact` presente.
- [ ] Con `x-user-id: tambero-b` sobre una necesidad de `farm-a` → 403 `FARM_FORBIDDEN`.
- [ ] Después de abrir el swipe de una hembra, `GET /api/needs?farmId=farm-a` no lista la `Need` sintética.

**M6 · Pantalla** (con mocks y contra la API; captura de cada estado en el PR)
- [ ] Estado 1: `/mercado` muestra "Hora de empezar, {nombre}", el título, la caja con placeholder, el micrófono deshabilitado con tooltip, "Preguntar" y los tres chips del MVP; el sidebar marca "Mercado y oportunidades".
- [ ] Estado 2: chip "Contratistas de arada cerca tuyo" → tarjeta con el texto y "Editar consulta" → "Lo que AgroMatch entendió" con las cuatro filas editables; una fila con `confidence < 0.8` sale con `Badge warn`; "Confirmar y buscar soluciones" y la leyenda.
- [ ] Estado 3: barra resumen con "Editar búsqueda", chips de orden, grilla de tarjetas con distancia, disponibilidad, reputación, precio, "#1 de N", badge no verificado, `AiExplanation` con indicador, "Excluidos (N)" con motivo → "Pedir fecha" muestra el contacto recién después.
- [ ] "Menor precio/ha" reordena sin nueva request y cada tarjeta conserva su "#N de M".
- [ ] Corregir la ubicación en la ficha y volver a confirmar reemplaza los resultados.
- [ ] "quiero mejorar los sólidos de mi tambo" → "Ir al motor genético" navega a `/motor-genetico/matching`.
- [ ] Vacío, cargando, error (con el `message` real del backend) y sin resultados se ven.

**M7 · Proveedores**
- [ ] El test de `shared-types` parsea `providers.json`; todos `verified: false` con `source`; al menos dos zonas.

**Anexo**
- [ ] `asesor-1` → 3 resúmenes, `a2a2Share` de `farm-a` ≈ 0,50. `tambero-a` → 403.
- [ ] La tab "Panel del asesor" de `/motor-genetico/asesor` muestra tres tarjetas y el gráfico comparativo; `tambero-a` no ve la tab.

## Riesgos y supuestos

- **Riesgo (el más grande):** el intake en vivo interpreta distinto en cada corrida y la demo muestra una ficha rara. Mitigación: prompt con ejemplos de `needs.samples.json` (few-shot), salida estructurada con esquema estricto, y la ficha **siempre** es editable — la demo corrige en vivo si hace falta, eso es parte del producto (RN-30).
- **Riesgo:** geocodificar "Río Cuarto" sin un servicio externo. Supuesto: el intake devuelve `lat`/`lng` desde el conocimiento del modelo para localidades argentinas conocidas, con `confidence` baja si duda; la ficha lo deja corregir. No se agrega un geocoder al MVP.
- **Riesgo:** hasta I2 el stub de `matchNeed` no filtra, así que la pestaña de excluidos está vacía con mocks apagados. Mitigación: los `samples/match-board-machinery.json` de MSW traen excluidos para que la pantalla se construya bien; en I2 aparecen los reales.
- **Supuesto:** `Need` pasa a `MATCHED` al matchear y no vuelve a `OPEN`; volver a matchear una `MATCHED` está permitido (recalcula).
- **Supuesto:** M7 se hace a mano con fuentes públicas; si aprieta, se usa la semilla de T0 (orden de caída del plan §9: A6 → M7).
- **Riesgo:** el mockup omite el ranking, el badge de verificación, la explicación y los excluidos, y alguien "limpia" la tarjeta para que quede igual al dibujo. Mitigación: REQ-B-08 los marca como obligatorios por regla de nivel superior; es criterio de revisión de PR.
- **Riesgo:** los chips de orden hacen creer que el ranking cambia. Mitigación: el "#N de M" del motor se imprime siempre y el chip por defecto es el orden del motor.
- **Supuesto:** `pantallas.md §3.1` quedó viejo frente a PR #11 y se corrige en un PR de docs; esta spec sigue al mockup.

## Preguntas abiertas

| # | Pregunta | Default tomado acá | Quién cierra |
|---|---|---|---|
| Q1 | `pantallas.md` §3.1 y N2 muestran una explicación con IA en cada tarjeta de proveedor, pero `ExplainerPort` recibe `ExplanationFacts`, que es genético. **No hay puerto de explicación genérica en los contratos.** | En el MVP la tarjeta muestra `reasons.join(' ')` con `AiExplanation source="FALLBACK"`. Si a B le sobra tiempo, un `GenericExplainerPort { explain(candidate: MatchCandidate, need: Need): Promise<Explanation> }` sería un **cambio aditivo** a `ports.ts` con el mismo control de alucinación que C4. No es un requisito de esta spec. | Dev B, avisando a los cuatro si agrega el puerto |
| Q2 | Los códigos 409 `NEED_INCOMPLETE` y `NEED_NOT_CONFIRMED` no están en ningún documento | Se definen acá siguiendo el formato de `api-skeleton` | Dev B |
| Q3 | ¿`PATCH /needs/:id` sin `confirm` guarda cambios en `DRAFT` sin confirmar? | Sí: guarda y sigue en `DRAFT` | Dev B |
| Q4 | ¿Quién tiene permiso de valorar? | El usuario dueño de la necesidad de la solicitud; se verifica `farmId` | Dev B |
| Q5 | ¿Cuántos proveedores exactos en M7? | Mínimo 25 públicos + las centrales de la semilla; el plan dice ~30 | Dev B o el analista |
| Q6 | ¿Cómo distingue `GET /needs` las `Need` sintéticas del swipe? | **Se persisten con `Need.synthetic: true`; `NeedRepo.listByFarm` las excluye salvo `includeSynthetic: true` (opción ya prevista en `api-skeleton`).** Misma convención en `mvp-d-match` Q1; las crea D, B solo las filtra. ✅ El campo ya está en `contracts-v1` (`mvp-0-foundation` Q5) | Dev B lo consume |
| Q7 | Los chips del mockup ("¿Buscás semilla de maíz?", "Flete Córdoba → Rosario", "Semen Angus parto fácil") caen fuera de N3 (insumos) y N8 (logística) | Se usan tres chips del MVP: arada, veterinario, sólidos del tambo. Si el equipo quiere los del mockup, hay que agregar proveedores de esas categorías o aceptar que devuelvan "sin proveedores" | Dev B con Tobías |
| Q8 | El micrófono del mockup ("dictá tu necesidad") | Ícono deshabilitado con tooltip "audio: hoja de ruta" (modelo de dominio §11) | Dev B |
| Q9 | Los chips de orden del mockup ("Mejor reputación", "Menor precio/ha") podrían leerse como que el ranking cambia | Reordenamiento de vista en el cliente; "#N de M" del motor siempre impreso; default = orden del motor (RN-33, RN-34) | Dev B |
| Q10 | "mapa" y "calendario" en la ficha del mockup | Solo visuales: la edición es inline (texto / fechas). Sin mapa ni date-picker nuevo en el MVP | Dev B |
| Q11 | El mockup no dibuja la pestaña de excluidos ni el badge de verificación | Se agregan igual (RN-31, RN-37); el toggle "Excluidos (N)" va debajo de la grilla | Dev B |

## Anexo reasignable — Panel del asesor (B6 + D6)

**Prioridad:** P1. Es lo primero que se cae de este flujo si aprieta. **Se puede mover a otro dev sin reescribir nada:** los requisitos `REQ-B-ADV-01` y `REQ-B-ADV-02` de arriba son autocontenidos.
**Tareas del plan:** B6 (1 h, API) + D6 (1,5 h, pantalla).
**Depende de:** `api-skeleton` (repos, `UserGuard` con rol), `frontend-shell` (ruta `/motor-genetico/asesor` y tab "Panel del asesor" del módulo Motor genético, renderizada solo para `ADVISOR`/`ADMIN`; en el mockup figura como "asesor · pendiente"). **Blanda** con `mvp-c-herd` (B2/B3): hasta I1 el resumen sale del stub de `classifyHerd`.

**Alcance recortado** (plan §9): lista de tambos del asesor con distribución por tier, % A2/A2 y % BB, y un gráfico comparativo de `avgTraits`. **NO entra:** filtros avanzados, exportación, drill-down a un tambo.

**Contratos:** `GET /advisor/overview` → `FarmSummary[]` (ver *Contratos*). `a2a2Share` = hembras con `betaCasein === 'A2/A2'` / hembras con perfil; `bbShare` = ídem con `kappaCasein === 'BB'`. `avgTraits` = media por rasgo de las hembras con perfil.

**Criterios de aceptación:** los dos marcados como *Anexo* en la sección anterior. Verificación manual con curl y captura de la tab `/motor-genetico/asesor`.

**Riesgo:** el gráfico comparativo no tiene librería decidida (convenciones §4: no se instala otra librería de componentes; `pantallas.md` no nombra una de gráficos). **Default:** barras con `ComparisonBar` o `Progress` de `components/ui`, sin librería nueva. Si el equipo quiere un gráfico real, es una decisión de D1 a avisar.
