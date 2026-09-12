# frontend-shell Specification

## Purpose

Deja `apps/frontend` con la estructura sobre la que cada flujo agrega su carpeta en `features/`: el sidebar estricto de **5 módulos** con las pantallas del MVP anidadas como **tabs** dentro de su módulo, el usuario simulado que setea `x-user-id`, el cliente de la API tipado con los esquemas de `shared-contracts` sobre React Query, y MSW sirviendo los fixtures para construir las pantallas sin la API levantada.

## Requirements

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
