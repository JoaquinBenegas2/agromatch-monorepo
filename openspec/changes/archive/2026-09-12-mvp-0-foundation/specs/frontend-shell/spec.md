# frontend-shell — Shell de 5 módulos, router, usuario simulado, cliente tipado y mocks

**Dueño:** Dev D (D1). Primeras 2 horas, antes de tocar su flujo.
**Prioridad:** P0. Bloquea toda pantalla de `mvp-b-need`, `mvp-c-herd`, `mvp-d-match` y los anexos.
**Precondición ya cumplida:** los 9 componentes compartidos y el resto de `apps/frontend/src/components/ui` (PR #9). No se re-especifican.
**Fuente visual (manda sobre `pantallas.md §1`):** `designs/01-sidebar-scaffolding.html`, `AgroMatch Home Conversacional.dc.html` y `AgroMatch Motor Genetico.dc.html` (PR #11).

## Purpose

Deja `apps/frontend` con la estructura sobre la que cada flujo agrega su carpeta en `features/`: el sidebar estricto de **5 módulos** con las pantallas del MVP anidadas como **tabs** dentro de su módulo, el usuario simulado que setea `x-user-id`, el cliente de la API tipado con los esquemas de `shared-contracts` sobre React Query, y MSW sirviendo los fixtures para construir las pantallas sin la API levantada.

## Alcance

**Entra**
- `App.tsx` monta `Shell` + `Sidebar` + `Topbar` de `components/ui` con los 5 módulos; la home del scaffold se elimina; `/ui-kit` se mantiene.
- Router con una ruta por tab de la tabla *Mapa de navegación*, y una **barra de tabs por módulo** (`Tabs` de `components/ui`) que cada flujo llena.
- Páginas **placeholder** para las tabs marcadas "pendiente" en el mockup: `EmptyState` con el texto "Pendiente · hoja de ruta" y la etiqueta `tag-version`. Nadie las implementa en el MVP.
- `shared/user`: usuario simulado (`tambero-a`, `tambero-b`, `asesor-1`, `admin`) elegido desde la fila de cuenta del pie del sidebar (`SidebarAccount` + `DropdownMenu`), persistido en `localStorage`, expuesto por un hook; setea `x-user-id` en toda llamada.
- `shared/api`: cliente `fetch` tipado que valida cada respuesta con el esquema zod de `shared-contracts`, agrega `x-user-id` y convierte `ApiError` en un error con `code`/`message`. Hooks de React Query por recurso con las claves convenidas.
- `mocks/`: MSW con un handler por ruta de `api.ts` que devuelve `fixtures/samples/*`, activado con `VITE_MOCKS=true`, un archivo de handlers por feature.
- Los cuatro estados obligatorios como patrón documentado en `features/_example/`.
- El **panel lateral del chat** como hueco en el shell (colapsado, a la derecha del contenido, solo dentro del módulo Motor genético); lo llena `mvp-a-core`.

**Queda afuera**
- Toda pantalla real (`features/market`, `herd-import`, `herd`, `matching`, `plan`, `advisor`, `chat`): las hace cada spec.
- El contenido de las tabs "pendiente": Setup conversacional, Mis matches / mensajes, Cargar lotes / servicios. Son hoja de ruta (N8, `baseline.md §1b` paso 7).
- Login, registro, perfil, configuración, notificaciones, administración.
- Las 21 pantallas `[DEPRECADO]` de `/designs` (02–22): referencia de estilo, no navegación.

## Contratos

### Mapa de navegación (sidebar de 5 módulos, un destino por módulo, tabs adentro)

| Módulo (sidebar) | Subtítulo | Tab | Ruta | Pantalla real | Spec | Visible para |
|---|---|---|---|---|---|---|
| **Mi establecimiento** | valor / setup | Setup conversacional | `/establecimiento` | placeholder "pendiente" (muestra el nombre del tambo de `GET /me`) | — | todos |
| **Mercado y oportunidades** | mercado general | Home marketplace general | `/mercado` | ¿Qué necesitás? (M6) | `mvp-b-need` | todos |
| **Motor genético** | motor técnico | Matching genético | `/motor-genetico/matching/:femaleId?` | Swipe, variante sin swipe (D4) | `mvp-d-match` | todos |
| | | Tablero del rodeo | `/motor-genetico/tablero` | Tablero (D3); su estado vacío es la Carga del rodeo (D2) | `mvp-c-herd` | todos |
| | | Carga del rodeo | `/motor-genetico/importar` | Carga del rodeo (D2), también accesible por "Subir Excel" | `mvp-c-herd` | todos |
| | | Panel del asesor | `/motor-genetico/asesor` | Panel del asesor (B6+D6) | `mvp-b-need` (anexo) | `ADVISOR`, `ADMIN` (la tab no se renderiza para un `FARMER`) |
| | | (panel lateral) | — | Chat sobre el rodeo (C6+B7+D8) | `mvp-a-core` (anexo) | todos, dentro del módulo |
| **Negociación y tratos** | transacciones | Mis matches / mensajes | `/negociacion/matches` | placeholder "pendiente" | — | todos |
| | | Plan de servicios | `/negociacion/plan` | Plan de servicios (D5) | `mvp-d-match` | todos |
| **Mis ofertas** | catálogo propio | Cargar lotes / servicios | `/ofertas` | placeholder "pendiente" | — | todos |
| — | — | — | `/` | redirige a `/mercado` | — | todos |
| — | — | — | `/ui-kit` | referencia viva de componentes | ya existe | todos |

Reglas del mapa:
- El sidebar tiene **exactamente 5 ítems**, uno por módulo, con la etiqueta de grupo y el subtítulo del mockup. Ninguna pantalla del MVP es un ítem propio del sidebar.
- Cada módulo con más de una tab muestra la **barra de tabs** arriba del contenido (`Tabs` con el estilo del mockup: tab activa oscura, las demás `ghost`, "pendiente" con `tag-version`).
- El `Topbar` muestra el breadcrumb `Módulo / **Tab**` y el avatar del usuario.
- El `farmId` activo SHALL derivarse del usuario: para un `FARMER`, su único tambo; para `ADVISOR`/`ADMIN`, un `Select` de tambo en el `Topbar` (default: el primero). El nombre del tambo activo es el subtítulo de la marca (`brand-sub`, "Tambo La Esperanza" en el mockup).
- El pie del sidebar es la fila de cuenta (`avatar`, nombre, `rol · tipo`) y **es el selector de usuario simulado**.

### Cliente de la API (`shared/api`)

```ts
export const api = {
  get<T>(path: string, schema: ZodType<T>): Promise<T>;
  post<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T>;
  patch<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T>;
  delete<T>(path: string, schema: ZodType<T>): Promise<T>;
  upload<T>(path: string, file: File, schema: ZodType<T>): Promise<T>; // multipart
};
export class ApiClientError extends Error { code: string; details: Record<string, unknown>; status: number }
```

Claves de React Query (convenciones §3), una por recurso:

| Recurso | Clave |
|---|---|
| Usuario | `['me']` |
| Toros | `['bulls']` |
| Necesidades | `['needs', farmId]`, `['needs', needId, 'matches']` |
| Rodeo | `['farms', farmId, 'females']`, `['farms', farmId, 'classifications', 'summary']` |
| Matching | `['farms', farmId, 'females', femaleId, 'matches', goalHash]` |
| Explicación | `['explanation', farmId, femaleId, naab, goalHash]` — **no se vuelve a pedir al volver a la lista** |
| Plan | `['farms', farmId, 'plan']` |
| Asesor | `['advisor', 'overview']` |

### Mocks (MSW)

Un handler por ruta de `api.ts`, con la misma forma de respuesta y **el mismo formato de error**. Los handlers leen `fixtures/samples/*.json` y los fixtures de entidades. `VITE_MOCKS=true` los activa; sin la variable, el front pega a `/api` (proxy de Vite al `:3333`). Un archivo de handlers por feature, apagable por separado en I1/I2.

## ADDED Requirements

### Requirement: REQ-FS-01 El sidebar tiene exactamente 5 módulos y las pantallas viven como tabs
La aplicación SHALL montar el shell con **exactamente los 5 módulos** del *Mapa de navegación*, un destino por módulo, y SHALL mostrar dentro de cada módulo la barra de tabs con sus pantallas. Con mocks activados, cada ruta de la tabla SHALL renderizar al menos su barra de tabs y su estado vacío o placeholder sin la API levantada.

#### Scenario: Recorrido con mocks
- **WHEN** se levanta el front con `VITE_MOCKS=true` y sin backend, y se recorre como `asesor-1` cada ruta de la tabla
- **THEN** el sidebar muestra 5 ítems y ninguna ruta rompe ni muestra un error de red; cada tab muestra su contenido del fixture, su `EmptyState` o su placeholder "pendiente"

#### Scenario: Ninguna pantalla es ítem del sidebar
- **WHEN** se inspecciona el sidebar en cualquier ruta
- **THEN** no hay ítems para "Tablero", "Swipe", "Plan" ni "Panel del asesor": aparecen solo en la barra de tabs de su módulo

### Requirement: REQ-FS-02 Usuario simulado con `x-user-id`
El front SHALL ofrecer, desde la fila de cuenta del pie del sidebar, un selector con los cuatro usuarios de `users.json`, SHALL persistir la elección en `localStorage` y SHALL enviar `x-user-id` en toda llamada a la API. Cambiar de usuario SHALL invalidar todas las queries.

#### Scenario: Cambiar de tambero a asesor
- **WHEN** el usuario elige `asesor-1` en la fila de cuenta
- **THEN** la siguiente llamada lleva `x-user-id: asesor-1`, la tab "Panel del asesor" aparece en Motor genético y el `Topbar` muestra un selector de tambo con `farm-a`, `farm-b` y `farm-c`

#### Scenario: Recarga de página
- **WHEN** se recarga el navegador
- **THEN** el usuario elegido se conserva

### Requirement: REQ-FS-03 Las tabs respetan el rol
La tab "Panel del asesor" y la ruta `/motor-genetico/asesor` SHALL estar disponibles solo para `ADVISOR` y `ADMIN`. Un `FARMER` que escriba la ruta a mano SHALL ver un `EmptyState` que explica que la pantalla es del asesor, no un error.

#### Scenario: Tambero en la tab del asesor
- **WHEN** `tambero-a` navega a `/motor-genetico/asesor`
- **THEN** la barra de tabs no muestra "Panel del asesor" y el contenido es un `EmptyState` con la explicación y un botón a "Tablero del rodeo"

### Requirement: REQ-FS-04 Cliente tipado que valida cada respuesta
Toda llamada a la API SHALL pasar por `shared/api`, SHALL validar la respuesta con el esquema zod correspondiente y SHALL exponer los errores del backend con su `code` y `message` reales. El front SHALL no tener ningún `fetch` fuera de `shared/api` ni ningún estado global fuera del usuario simulado y el tambo activo.

#### Scenario: Respuesta que no cumple el contrato
- **WHEN** un mock devuelve un `Bull` sin `naab`
- **THEN** `api.get('/bulls', z.array(BullSchema))` rechaza con un error que nombra el campo, y la pantalla lo muestra con `ErrorMessage`

#### Scenario: Error del backend
- **WHEN** la API responde 403 `{ code: 'FARM_FORBIDDEN', message: 'No tenés acceso a este establecimiento', details: {} }`
- **THEN** la pantalla muestra exactamente ese `message` en `ErrorMessage`, nunca "algo salió mal"

### Requirement: REQ-FS-05 Mocks por feature, apagables por separado
MSW SHALL tener un archivo de handlers por feature. Desactivar los handlers de una feature SHALL dejar que sus rutas lleguen a la API real mientras las demás siguen mockeadas.

#### Scenario: I1 para el flujo del rodeo
- **WHEN** Dev C apaga los handlers de `herd-import` y `herd` en la hora 9
- **THEN** `/motor-genetico/tablero` pega a `:3333` y `/mercado` sigue respondiendo con los fixtures

### Requirement: REQ-FS-06 Los cuatro estados están documentados con un ejemplo
El front SHALL incluir una feature de ejemplo que muestre el patrón de los cuatro estados obligatorios (vacío, cargando, error, sin resultados) con `EmptyState`, `Skeleton` y `ErrorMessage`, para que cada dev lo copie.

#### Scenario: Ejemplo navegable
- **WHEN** un dev abre `features/_example/`
- **THEN** encuentra un componente que consume un hook de React Query y renderiza los cuatro estados, sin lógica de negocio

### Requirement: REQ-FS-07 El scaffold anterior se elimina
La home del scaffold (`Home` en `App.tsx`, con el `fetch('/api/users')`) SHALL no existir tras esta capacidad. `/ui-kit` SHALL seguir disponible.

#### Scenario: Ruta raíz
- **WHEN** se navega a `/`
- **THEN** redirige a `/mercado` dentro del shell, con "Mercado y oportunidades" activo en el sidebar

### Requirement: REQ-FS-08 Las tabs "pendiente" son placeholders honestos
Las tabs Setup conversacional, Mis matches / mensajes y Cargar lotes / servicios SHALL existir en la navegación con la etiqueta "pendiente" y SHALL renderizar un `EmptyState` que diga que es hoja de ruta. Ningún flujo del MVP SHALL implementar contenido en ellas.

#### Scenario: Tab pendiente
- **WHEN** se navega a `/ofertas`
- **THEN** el sidebar marca "Mis ofertas", la tab "Cargar lotes / servicios" lleva `tag-version` "pendiente" y el contenido es un `EmptyState` sin llamadas a la API

#### Scenario: Setup muestra el tambo
- **WHEN** se navega a `/establecimiento` como `tambero-a`
- **THEN** el placeholder muestra el nombre del tambo de `GET /me` y la etiqueta "pendiente"; no hay formulario

### Requirement: REQ-FS-09 El hueco del chat existe en el módulo Motor genético
El shell SHALL reservar un panel lateral derecho, colapsado por defecto, visible solo dentro de las rutas `/motor-genetico/*`, con un botón para abrirlo en el `Topbar`. Hasta que `mvp-a-core` lo llene, SHALL mostrar un `EmptyState` "Chat · pendiente".

#### Scenario: Panel fuera del módulo
- **WHEN** se navega a `/mercado`
- **THEN** el botón del chat no aparece y el panel no se renderiza

## Reglas que respeta

RN-38 (el `farmId` activo siempre es uno del usuario; el backend lo vuelve a verificar) · convenciones §3, §4, §5, §7, §12 · `pantallas.md §2`, `§4` (reglas visuales 4 y 5) y `§5` (qué no se diseña) · N8 (las tabs de negociación y ofertas son placeholders) · `designs/01-sidebar-scaffolding.html` (5 módulos, "un solo destino de sidebar por módulo", pantallas del MVP como tabs).

## Criterios de aceptación

- [ ] Verificación manual: con `VITE_MOCKS=true` y sin backend, las 10 rutas de la tabla navegan como `asesor-1` y como `tambero-a`; el sidebar tiene 5 ítems (REQ-FS-01, REQ-FS-03). Captura en el PR.
- [ ] Cambiar el usuario en la fila de cuenta cambia el header de la siguiente request (pestaña Network).
- [ ] `rg "fetch\(" apps/frontend/src` solo matchea dentro de `shared/api`.
- [ ] Forzar un 403 desde el mock muestra el `message` del backend en `ErrorMessage`.
- [ ] `features/_example/` existe y muestra los cuatro estados.
- [ ] Las 3 tabs "pendiente" renderizan `EmptyState` sin llamadas a la API.
- [ ] Con `VITE_MOCKS` apagado y el backend con `api-skeleton`, `/mercado` muestra el nombre del usuario de `GET /me` en el saludo (criterio de cierre de T0).

## Riesgos y supuestos

- **Riesgo:** los `samples/*.json` de MSW divergen de la API real y en I1/I2 las pantallas rompen. Mitigación: validan contra los mismos esquemas zod (REQ-SC-05) y el cliente valida la respuesta real (REQ-FS-04).
- **Riesgo:** un dev arma su pantalla como ítem del sidebar "porque es más fácil". Mitigación: REQ-FS-01 segundo escenario es criterio de revisión de PR.
- **Supuesto:** `localStorage` alcanza para el usuario simulado (D4).
- **Supuesto:** `pantallas.md §1` (grupos Necesidad / Rodeo / Asesor) quedó viejo frente a PR #11; se corrige en un PR de docs. Esta spec sigue al mockup.

## Preguntas abiertas

| # | Pregunta | Default | Quién cierra |
|---|---|---|---|
| Q1 | Los paths de las rutas no están en ningún documento ni mockup | Los de la tabla *Mapa de navegación* | Dev D en D1; los demás los consumen |
| Q2 | ¿El selector de tambo del asesor va en el `Topbar` o en `brand-sub`? | `Topbar`; `brand-sub` solo muestra el nombre | Dev D |
| Q3 | El mockup no tiene selector de usuario (es un producto real con login); el MVP lo necesita (D4) | La fila de cuenta del pie del sidebar abre un `DropdownMenu` con los 4 usuarios | Dev D |
| Q4 | "Carga del rodeo" no aparece como tab en el mockup; entra por el botón "Subir Excel" de la barra del módulo | Tab propia `/motor-genetico/importar` + el botón "Subir Excel" navega ahí; el estado vacío del Tablero también | Dev D deja la ruta, Dev C la llena |
| Q5 | ¿El chat es un panel del shell o cada tab lo abre? | Panel del shell, solo en `/motor-genetico/*` (REQ-FS-09) | Dev D deja el hueco, Dev A lo llena |
