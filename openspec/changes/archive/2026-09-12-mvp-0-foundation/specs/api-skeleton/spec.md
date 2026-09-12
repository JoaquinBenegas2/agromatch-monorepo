# api-skeleton — El esqueleto de la API sobre el que cada flujo agrega su módulo

**Dueño:** la semilla (la misma persona que `shared-contracts`, inmediatamente después). ~1 h.
**Prioridad:** P0. Bloquea `mvp-b-need`, `mvp-c-herd`, `mvp-d-match` y el anexo de `mvp-a-core`.
**Tarea del plan:** B1 (reubicada acá; deja de ser de Dev B).

## Purpose

Deja `apps/backend` listo para que cada dev agregue su módulo sin tocar nada compartido: persistencia en PostgreSQL detrás de interfaces de repositorio, seed re-ejecutable con los fixtures, aislamiento por establecimiento vía `x-user-id`, formato único de error, puertos de IA inyectados según `AI_MODE`, y dos endpoints de humo (`GET /me`, `GET /bulls`).

## Alcance

**Entra**
- `apps/backend/prisma/schema.prisma` con las entidades de los contratos y su migración inicial.
- Interfaces de repositorio + implementación Prisma, una por agregado.
- Seed idempotente desde `@org/shared-types/fixtures` y scripts `db:seed` / `db:reset`.
- `UserGuard` global (header `x-user-id`) y decorador para obtener el usuario y validar `farmId`.
- Filtro global de excepciones con el formato `{ code, message, details }` y `ValidationPipe` con zod.
- Módulo `ai` con un provider por puerto (`ExplainerPort`, `GoalParserPort`, `HerdIngestionPort`, `NeedIntakePort`, `ChatPort`, `LlmClient`) resuelto por `AI_MODE`.
- Módulos vacíos con su carpeta ya creada para que nadie pise a nadie: `needs/`, `providers/`, `matching/`, `requests/`, `herd-import/`, `herd/`, `classification/`, `planning/`, `advisor/`, `chat/`.
- `GET /me`, `GET /bulls`.
- Eliminación del scaffold: `UsersController`, `UsersModule`, `GET /api/users`, `model User` placeholder.

**Queda afuera**
- Cualquier endpoint de flujo (los implementa cada spec).
- Login real (D4: usuarios simulados).
- Swagger (convenciones §12: el contrato son los esquemas zod).

## Contratos

### Persistencia

Modelos Prisma, uno por entidad de los contratos: `User`, `Farm`, `Female` (con `GenomicProfile` embebido como JSON o columnas, a elección de la semilla), `Bull`, `Classification`, `BreedingPlan` + `PlanItem`, `Need`, `Provider`, `Capability`, `ServiceRequest`, `Review`, `HerdImport` (archivo temporal + `MappingProposal`, TTL de sesión). Claves: `Bull.naab` única (RN-22); `Female (farmId, visualId)` única; `Classification (farmId, femaleId)` única con `goalHash` para invalidar.

Interfaces (en `apps/backend/src/repos/*.port.ts`), todas devuelven tipos de `@org/shared-types`, nunca tipos de Prisma:

```ts
export interface UserRepo     { findById(id: string): Promise<User | null> }
export interface FarmRepo     { findByIds(ids: string[]): Promise<Farm[]>; findById(id: string): Promise<Farm | null> }
export interface FemaleRepo   { listByFarm(farmId: string): Promise<Female[]>; upsertMany(farmId: string, f: Female[]): Promise<number>; findById(farmId: string, id: string): Promise<Female | null> }
export interface BullRepo     { list(): Promise<Bull[]>; findByNaab(naab: string): Promise<Bull | null>; upsertMany(b: Bull[]): Promise<{ added: number; updated: number }> }
export interface ClassificationRepo { replaceForFarm(farmId: string, goal: BreedingGoal, c: Classification[]): Promise<void>; listByFarm(farmId: string): Promise<{ goal: BreedingGoal; items: Classification[] } | null> }
export interface PlanRepo     { getOrCreate(farmId: string): Promise<BreedingPlan>; save(plan: BreedingPlan): Promise<BreedingPlan> }
export interface NeedRepo     { create(n: Need): Promise<Need>; update(n: Need): Promise<Need>; findById(id: string): Promise<Need | null>; listByFarm(farmId: string, opts?: { includeSynthetic?: boolean }): Promise<Need[]> }
export interface ProviderRepo { list(filter?: { category?: NeedCategory }): Promise<Provider[]>; findById(id: string): Promise<Provider | null>; listCapabilities(filter?: { category?: NeedCategory }): Promise<Capability[]> }
export interface ServiceRequestRepo { create(r: ServiceRequest): Promise<ServiceRequest>; findById(id: string): Promise<ServiceRequest | null> }
export interface ReviewRepo   { create(r: Review): Promise<Review> }
export interface HerdImportRepo { save(importId: string, farmId: string, file: Uint8Array, filename: string, proposal: MappingProposal): Promise<void>; get(importId: string): Promise<{ farmId: string; file: Uint8Array; filename: string; proposal: MappingProposal } | null> }
```

Tokens de inyección: `USER_REPO`, `FARM_REPO`, … uno por interfaz. **Nadie importa `@prisma/client` fuera de `apps/backend/src/repos/prisma/`.**

### Autenticación simulada (RN-38)

- Header `x-user-id`. Sin header o usuario inexistente → **401** `USER_HEADER_MISSING` / `USER_NOT_FOUND`.
- Toda ruta con `:farmId` (o body/query `farmId`) SHALL verificar `farmId ∈ user.farmIds` → si no, **403** `FARM_FORBIDDEN`.
- `GET /advisor/overview` exige `role === 'ADVISOR' | 'ADMIN'` → si no, **403** `ROLE_FORBIDDEN`.
- Decorador `@CurrentUser()` devuelve el `User`.

### Errores (convenciones §5)

```ts
interface ApiError { code: string; message: string; details: Record<string, unknown> }
```

| Situación | HTTP | `code` |
|---|---|---|
| Body/query/params no validan contra zod | 400 | `VALIDATION_ERROR` (`details.issues` = issues de zod) |
| Sin `x-user-id` / usuario inexistente | 401 | `USER_HEADER_MISSING` / `USER_NOT_FOUND` |
| Tambo ajeno / rol insuficiente | 403 | `FARM_FORBIDDEN` / `ROLE_FORBIDDEN` |
| Recurso inexistente | 404 | `<ENTITY>_NOT_FOUND` |
| Precondición de dominio | 409 | definido por cada flujo (ej. `HERD_NOT_CLASSIFIED`) |
| Fallo del LLM tras reintento | 502 | `LLM_SCHEMA_MISMATCH` / `LLM_UNAVAILABLE` |
| Cualquier otro | 500 | `INTERNAL_ERROR` |

`message` siempre en español y apto para mostrarse al usuario. Lanzar `new DomainError(code, message, status, details?)` desde un servicio SHALL producir ese formato.

### Módulo `ai` — inyección por `AI_MODE`

| Token | `AI_MODE=fake` | `AI_MODE=live` (default) |
|---|---|---|
| `LLM_CLIENT` | `FakeLlmClient` | `AnthropicLlmClient` (`llm-client`) |
| `EXPLAINER_PORT` | `FakeExplainer` | adaptador real de `mvp-d-match` (C4); hasta que exista, el fake |
| `GOAL_PARSER_PORT` | `FakeGoalParser` | adaptador real de `mvp-d-match` (C5); hasta que exista, el fake |
| `HERD_INGESTION_PORT` | `FakeHerdIngestion` | adaptador real de `mvp-c-herd` (C2); hasta que exista, el fake |
| `NEED_INTAKE_PORT` | `FakeNeedIntake` | adaptador real de `mvp-b-need` (M4); hasta que exista, el fake |
| `CHAT_PORT` | `FakeChat` | adaptador real de `mvp-a-core` (C6); hasta que exista, el fake |

El módulo `ai` SHALL tener **un solo archivo de registro** (`ai.providers.ts`) donde cada dev cambia la línea de su puerto cuando publica el adaptador real. Es el único archivo compartido que se toca durante el desarrollo, y se toca de a una línea.

### Endpoints de humo

| Ruta | Respuesta |
|---|---|
| `GET /me` | `{ user: User; farms: Farm[] }` con los tambos de `user.farmIds` |
| `GET /bulls` | `Bull[]` completo del catálogo (semilla o real, según el seed) |

### Scripts

| Script | Qué hace |
|---|---|
| `npm run db:up` / `db:migrate` | Ya existen |
| `npm run db:seed` | Carga `users`, `farms`, `herd-farm-{a,b,c}`, `bulls.seed`, `providers` desde `@org/shared-types/fixtures`. **Idempotente:** correrlo dos veces deja el mismo estado |
| `npm run db:reset` | `prisma migrate reset --force` + `db:seed`. Antes de cada ensayo de la demo |
| `npm run dev` | Ya existe: backend `:3333`, frontend `:4200` |

## ADDED Requirements

### Requirement: REQ-AK-01 La persistencia refleja los contratos y queda detrás de repositorios
El esquema Prisma SHALL contener un modelo por entidad de `shared-contracts`. Todo acceso a datos desde servicios y controladores SHALL pasar por una interfaz de repositorio que devuelve tipos de `@org/shared-types`. Ningún archivo fuera de `apps/backend/src/repos/prisma/` SHALL importar `@prisma/client` ni el cliente generado.

#### Scenario: Migración inicial
- **WHEN** se corre `npm run db:up && npm run db:migrate`
- **THEN** la base tiene tablas para `User`, `Farm`, `Female`, `Bull`, `Classification`, `BreedingPlan`, `Need`, `Provider`, `Capability`, `ServiceRequest`, `Review` y `HerdImport`, con `Bull.naab` único

#### Scenario: Prisma no se filtra
- **WHEN** se busca `@prisma/client` o `generated/prisma` en `apps/backend/src`
- **THEN** solo aparece dentro de `repos/prisma/`

### Requirement: REQ-AK-02 El seed carga los fixtures y se puede volver a correr
`npm run db:seed` SHALL cargar todos los fixtures de `shared-contracts` y SHALL ser idempotente. `npm run db:reset` SHALL dejar la base exactamente en el estado del seed.

#### Scenario: Seed dos veces
- **WHEN** se corre `npm run db:seed` dos veces seguidas
- **THEN** la segunda corrida termina sin error y `GET /farms/farm-a/females` devuelve 293 hembras, no 586

#### Scenario: Volver al estado inicial antes de un ensayo
- **WHEN** se probó la demo (se importó un rodeo, se armó un plan) y se corre `npm run db:reset`
- **THEN** el plan de `farm-a` está vacío, `farm-a` tiene sus 293 hembras originales sin clasificar y `GET /bulls` devuelve los 12 toros semilla

### Requirement: REQ-AK-03 Aislamiento por establecimiento con usuario simulado
La API SHALL identificar al usuario por el header `x-user-id` y SHALL rechazar con 403 cualquier acceso a un `farmId` que no esté en `user.farmIds` (RN-38). Sin header válido SHALL responder 401.

#### Scenario: Tambo ajeno
- **WHEN** `tambero-b` pide `GET /api/farms/farm-a/females`
- **THEN** responde 403 con `{ code: 'FARM_FORBIDDEN', message: <en español>, details: { farmId: 'farm-a' } }`

#### Scenario: El asesor ve sus tres tambos
- **WHEN** `asesor-1` pide `GET /api/me`
- **THEN** `farms` contiene `farm-a`, `farm-b` y `farm-c`

#### Scenario: Sin header
- **WHEN** se pide `GET /api/me` sin `x-user-id`
- **THEN** responde 401 con `code: 'USER_HEADER_MISSING'`

### Requirement: REQ-AK-04 Formato único de error
Toda respuesta de error de la API SHALL tener la forma `{ code, message, details }`, con `code` estable en mayúsculas y guiones bajos y `message` en español. Un body que no valida contra su esquema zod SHALL producir 400 `VALIDATION_ERROR` con los issues en `details`.

#### Scenario: Body inválido
- **WHEN** se hace `POST /api/farms/farm-a/classifications` con `{ goal: { preset: 'X' } }`
- **THEN** responde 400 con `code: 'VALIDATION_ERROR'` y `details.issues` no vacío

#### Scenario: Error inesperado
- **WHEN** un servicio lanza una excepción no controlada
- **THEN** responde 500 con `code: 'INTERNAL_ERROR'`, un `message` en español y sin stack trace en el body

### Requirement: REQ-AK-05 Los puertos de IA se inyectan según AI_MODE
El módulo `ai` SHALL registrar una implementación por cada puerto de `ports.ts` y `NeedIntakePort`, eligiendo el fake o el adaptador real según `AI_MODE` (`live` por defecto). Mientras el adaptador real de un puerto no exista, `live` SHALL resolver al fake de ese puerto sin fallar.

#### Scenario: Arranque en live sin adaptadores reales
- **WHEN** la API arranca con `AI_MODE=live` y ningún flujo publicó todavía su adaptador
- **THEN** arranca sin error y `POST /api/goals/parse` responde con `FakeGoalParser`

#### Scenario: Publicar un adaptador real
- **WHEN** Dev D publica el explicador real y cambia la línea de `EXPLAINER_PORT` en `ai.providers.ts`
- **THEN** en `live` el explicador es el real y en `fake` sigue siendo `FakeExplainer`, sin tocar ningún otro archivo

### Requirement: REQ-AK-06 Endpoints de humo
`GET /me` SHALL devolver el usuario y sus tambos; `GET /bulls` SHALL devolver el catálogo completo.

#### Scenario: Humo con la semilla
- **WHEN** `tambero-a` pide `GET /api/me` y `GET /api/bulls`
- **THEN** recibe `{ user: { id: 'tambero-a', role: 'FARMER', … }, farms: [farm-a] }` y 12 toros que validan contra `BullSchema`

### Requirement: REQ-AK-07 El scaffold anterior se elimina
`UsersController`, `UsersModule`, la ruta `GET /api/users` y el modelo `User` placeholder SHALL no existir tras esta capacidad.

#### Scenario: Ruta vieja
- **WHEN** se pide `GET /api/users`
- **THEN** responde 404 con el formato único de error

## Reglas que respeta

RN-38 (REQ-AK-03) · RN-22 (`Bull.naab` único, REQ-AK-01) · RN-36 (`Provider.contact` no sale por `GET /providers`; lo hace cumplir `mvp-b-need`, el repo lo permite) · convenciones §5, §8, §9, §11 · D4 y D9 del handoff.

## Criterios de aceptación

- [ ] `npm run db:up && npm run db:migrate && npm run db:seed` deja 293 + ~150 + ~150 hembras, 12 toros, 3 tambos, 4 usuarios, proveedores semilla.
- [ ] Verificación manual (convenciones §1): `curl -H 'x-user-id: tambero-b' :3333/api/farms/farm-a/females` → 403 `FARM_FORBIDDEN`.
- [ ] `curl -H 'x-user-id: asesor-1' :3333/api/me` → 3 tambos.
- [ ] `curl :3333/api/me` sin header → 401.
- [ ] La API arranca en `AI_MODE=live` sin clave de API configurada (los fakes no la necesitan) y responde `GET /bulls`.
- [ ] `rg "@prisma/client" apps/backend/src` solo matchea dentro de `repos/prisma/`.

## Riesgos y supuestos

- **Supuesto (decisión por defecto, no está en el handoff):** sin header → 401 y usuario inexistente → 401. Se eligió 401 y no 400 para que el front lo trate como "elegí un usuario".
- **Riesgo:** `HerdImport` guarda el archivo del Excel entre `proposeMapping` y `confirm`. Se asume que cabe en una columna `bytea` (los Excel de genotipado son de cientos de KB). Si molesta, se guarda en disco temporal; el repo lo esconde.
- **Riesgo:** el seed tarda si inserta de a uno. Mitigación: `createMany` por lote.
- **Supuesto:** `Classification` se guarda con el hash del `BreedingGoal` que la produjo; cambiar de objetivo reclasifica (lo define `mvp-c-herd`).

## Preguntas abiertas

| # | Pregunta | Default | Quién cierra |
|---|---|---|---|
| Q1 | ¿`GenomicProfile` como JSON o como columnas? | JSON (`jsonb`): el motor no consulta por rasgo, lee el rodeo entero | Semilla |
| Q2 | ¿Dónde vive el archivo del Excel entre los dos pasos de importación? | `HerdImport.file bytea` | Semilla, y C si le molesta |
| Q3 | ¿`x-user-id` desconocido es 401 o 404? | 401 | Semilla |
