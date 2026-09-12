# api-skeleton Specification

## Purpose

Deja `apps/backend` listo para que cada dev agregue su módulo sin tocar nada compartido: persistencia en PostgreSQL detrás de interfaces de repositorio, seed re-ejecutable con los fixtures, aislamiento por establecimiento vía `x-user-id`, formato único de error, puertos de IA inyectados según `AI_MODE`, y dos endpoints de humo (`GET /me`, `GET /bulls`).

## Requirements

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
