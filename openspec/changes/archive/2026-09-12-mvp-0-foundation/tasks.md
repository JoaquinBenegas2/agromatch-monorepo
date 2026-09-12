## 1. shared-contracts — dependencias y estructura

- [x] 1.1 Agregar `zod` como dependencia explícita de `packages/shared-types` (ya resuelto en el árbol, se declara) y crear `packages/shared-types/src/{domain.ts,marketplace.ts,ports.ts,api.ts,schemas.ts}`, `packages/shared-types/fixtures/`, `packages/shared-types/testing/`; verificar con `ls`.
- [x] 1.2 Generar `packages/matching-core`, `packages/genetics-core`, `packages/ai` con `npx nx g @nx/js:lib` y verificar que aparecen en `npx nx show projects`.

## 2. shared-contracts — dominio, marketplace, puertos, schemas

- [x] 2.1 Escribir `domain.ts` con la firma exacta de la spec (`Scale`, `TraitKey`, `TraitVector`, `TRAIT_DIRECTION`, `BetaCasein`, `KappaCasein`, `GenomicProfile`, `Female`, `Bull`, `TierQuotas`, `GrayZone`, `Farm`, `BreedingGoal`, `Classification`, `FilterResult`, `CaseinOdds`, `ExplanationFacts`, `Explanation`, `PlanItem`, `BreedingPlan`, `User`, `TraitStats`) como tipos derivados de `z.infer` de `schemas.ts`.
- [x] 2.2 Escribir `marketplace.ts` con la firma exacta (`NeedCategory`, `GeoPoint`, `TimeWindow`, `Unit`, `Magnitude`, `Need`, `PriceModel`, `ProviderType`, `Provider`, `Capability`, `FitBreakdown`, `MatchCandidate`, `MatchBoard`, `ServiceRequestStatus`, `ServiceRequest`, `Review`, `VerticalEngine`, `NeedIntakePort`).
- [x] 2.3 Escribir `ports.ts` (`FemaleField`, `ColumnMapping`, `MappingProposal`, `RowRejection`, `HerdImportResult`, `CatalogImportResult`, `HerdIngestionPort`, `CatalogIngestionPort`, `ExplainerPort`, `GoalParserPort`, `HerdQueryTools`, `ChatAnswer`, `ChatPort`, `LlmClient`, `LlmPrompt`).
- [x] 2.4 Escribir `api.ts` con las rutas de la tabla, `ClassificationSummary`, `FarmSummary`, `ApiError`, y un tipo de body/respuesta por endpoint.
- [x] 2.5 Escribir `schemas.ts` con un esquema zod por cada tipo de `domain.ts`/`marketplace.ts`/`ports.ts`/`api.ts` que viaja entre paquetes; `GenomicProfileSchema`/`FemaleSchema`/`BullSchema` SHALL rechazar `scale !== 'CDCB'` (REQ-SC-04); re-derivar los tipos de `domain.ts`/`marketplace.ts` con `z.infer` de estos esquemas (REQ-SC-01, REQ-SC-02, REQ-SC-03). Verificar con `npx nx build shared-types`.
- [x] 2.6 Exportar todo desde `packages/shared-types/src/index.ts`; correr `rg "MatchResult|MatchSet" packages apps` y confirmar que no matchea (REQ-SC-02).

## 3. shared-contracts — fixtures y fakes

- [x] 3.1 Mover `fixtures/herd-farm-a.json` a `packages/shared-types/fixtures/herd-farm-a.json`, conservando `_meta` y `females`; crear `herd-farm-b.json` y `herd-farm-c.json` sintéticos (~150 animales, semilla fija, `source: "DEMO SINTÉTICO"`).
- [x] 3.2 Crear `bulls.seed.json` (12 toros: 8 HO incluyendo `029HO21010`, `029HO19531` y 2 hijos de `029HO19531`, 1 JE, 3 de carne AN/HE/LM; al menos 3 lecheros con `scs ≤ 2.80` y `CONVENTIONAL`; `source: "SEED PROVISORIO"`).
- [x] 3.3 Crear `providers.json` (proveedores/capacidades semilla MACHINERY, VET, GENETICS con `verified: false`), `needs.samples.json` (5 necesidades en texto libre + estructuradas), `farms.json` (`farm-a`, `farm-b`, `farm-c` con `scsGrayZone: {3.10,3.18}`, `plGrayZone: {0.00,0.20}`, cupos 25/30, `calvingEaseMaxHeifer: 2.5`), `users.json` (`tambero-a`, `tambero-b`, `asesor-1`, `admin`).
- [x] 3.4 Crear `samples/*.json`: `mapping-proposal`, `herd-import-result`, `classifications`, `classification-summary`, `match-board-genetics`, `match-board-machinery`, `explanation`, `explanation-facts`, `breeding-plan`, `farm-summaries`, `need-draft`, `chat-answer`.
- [x] 3.5 Escribir un test en `shared-types` que parsea cada fixture contra su esquema zod y verifica los conteos (293/~150/~150 animales, 12 toros, 3 tambos, 4 usuarios, `029HO19531` con ≥2 hijos, 2 hembras sin `sireNaab`, `visualId` no numérico presente); correr `npx nx test shared-types` en verde (REQ-SC-05).
- [x] 3.6 Escribir `packages/shared-types/testing/fakes.ts` con `FakeHerdIngestion`, `FakeCatalogIngestion`, `FakeExplainer`, `FakeGoalParser`, `FakeNeedIntake`, `FakeChat`, `FakeLlmClient`, deterministas y sin red (REQ-SC-07); agregar tests puntuales de cada fake.

## 4. shared-contracts — stubs de los núcleos

- [x] 4.1 Implementar en `genetics-core` los stubs con firma final: `deriveCategory`, `computeTraitStats`, `expectedProgeny`, `normalize`, `caseinOdds`, `inbreedingFilter`, `calvingEaseFilter`, `classifyHerd` (tercios por CI), `classifyHerdClassic`, `scoreOneCandidate`, `scoreCandidates` (ordena por CI del toro, `compatibility = 100 − 5·posición`), `toExplanationFacts`, `makeGeneticsNeed`, `buildAutoPlan` (primer toro de `ranked`), `GOAL_PRESETS`, `GeneticsVertical`.
- [x] 4.2 Implementar en `matching-core` los stubs con firma final: `hardFilters` (todo `passed: true`), `scoreCandidate`, `matchNeed` (puntúa por cercanía, delega en vertical si `canHandle`), `registerVertical`, `listVerticals`.
- [x] 4.3 Test: `scoreCandidates(...)` con el stub devuelve `MatchBoard` con `ranked` ordenado, `compatibility` del #1 = 100, `rank` 1..n, `excluded: []` (REQ-SC-06). Test: `matchNeed(need, caps, provs, [GeneticsVertical])` con `need.category: 'GENETICS'` da `verticalFacts` definido y `fit.vertical` en [0,1]. Correr `npx nx test genetics-core matching-core` en verde.
- [x] 4.4 Correr `npx nx run-many -t build test` sobre los 4 paquetes nuevos + `shared-types`, en verde, con cero errores de resolución de import (REQ-SC-01).

## 5. api-skeleton — Prisma y repositorios

- [x] 5.1 Reescribir `apps/backend/prisma/schema.prisma`: modelos `User`, `Farm`, `Female` (con `GenomicProfile` como `Json`), `Bull` (ídem), `Classification` (única por `farmId+femaleId`, con `goalHash`), `BreedingPlan`+`PlanItem`, `Need`, `Provider`, `Capability`, `ServiceRequest`, `Review`, `HerdImport` (`file Bytes`); `Bull.naab` único, `Female(farmId, visualId)` única. Generar migración con `npx nx run @org/backend:db-migrate` (requiere `db:up`) y verificar que corre sin error.
- [x] 5.2 Crear interfaces de repositorio en `apps/backend/src/repos/*.port.ts` con las firmas exactas de la spec, devolviendo tipos de `@org/shared-types`.
- [x] 5.3 Implementar cada repo en `apps/backend/src/repos/prisma/*.repo.ts` sobre `PrismaService`, con sus tokens de inyección (`USER_REPO`, `FARM_REPO`, etc.) registrados en un `RepositoriesModule`; verificar `rg "@prisma/client" apps/backend/src` solo matchea dentro de `repos/prisma/`.
- [x] 5.4 Eliminar `UsersController`, `UsersModule`, `GET /api/users`, el modelo `User` placeholder ya reescrito en 5.1 (REQ-AK-07); verificar `curl :3333/api/users` → 404 con el formato único de error.

## 6. api-skeleton — auth simulada, errores, seed

- [x] 6.1 Implementar `UserGuard` global (header `x-user-id`) + `@CurrentUser()` + verificación `farmId ∈ user.farmIds` → 403 `FARM_FORBIDDEN`; `GET /advisor/overview` (placeholder de ruta) exige `role ADVISOR|ADMIN` → 403 `ROLE_FORBIDDEN`; sin header o usuario inexistente → 401 `USER_HEADER_MISSING`/`USER_NOT_FOUND` (REQ-AK-03).
- [x] 6.2 Implementar `DomainError`, filtro global de excepciones con formato `{ code, message, details }`, y `ValidationPipe` basado en zod que traduce issues a 400 `VALIDATION_ERROR` (REQ-AK-04).
- [x] 6.3 Escribir `scripts db:seed`/`db:reset` (o targets Nx) que cargan `users`, `farms`, `herd-farm-{a,b,c}`, `bulls.seed`, `providers` desde `@org/shared-types/fixtures` con `createMany` por lote, idempotente (REQ-AK-02); correr dos veces seguidas y verificar mismo conteo de hembras.
- [x] 6.4 Tests/verificación manual: `curl -H 'x-user-id: tambero-b' :3333/api/farms/farm-a/females` → 403 `FARM_FORBIDDEN`; `curl -H 'x-user-id: asesor-1' :3333/api/me` → 3 tambos; `curl :3333/api/me` sin header → 401. (La ruta `farms/:farmId/females` la crea `mvp-c-herd`; el mecanismo `FarmAccessGuard`/`RolesGuard` se cubre con tests unitarios ya que api-skeleton no tiene todavía una ruta `:farmId` propia.)

## 7. api-skeleton — módulo ai, endpoints de humo, módulos vacíos

- [x] 7.1 Crear módulo `ai` en `apps/backend/src/ai/` con `ai.providers.ts` (un provider por puerto, elegido por `AI_MODE`, resolviendo a fakes de `@org/shared-types/testing` en ambos modos hasta que exista el adaptador real) y el token `LLM_CLIENT` (fake en `fake`, `AnthropicLlmClient` de `packages/ai` en `live`); verificar que la API arranca en `AI_MODE=live` sin `ANTHROPIC_API_KEY` (REQ-AK-05).
- [x] 7.2 Crear las carpetas de módulo vacías: `needs/`, `providers/`, `matching/`, `requests/`, `herd-import/`, `herd/`, `classification/`, `planning/`, `advisor/`, `chat/`.
- [x] 7.3 Implementar `GET /me` y `GET /bulls` (REQ-AK-06); verificar con `curl` que `tambero-a` recibe su `Farm` y que `GET /bulls` valida contra `z.array(BullSchema)`.
- [x] 7.4 Correr `npx nx run-many -t build test -p backend` en verde y validar todos los criterios de aceptación de `api-skeleton` (incluye arranque en `AI_MODE=live` sin clave, verificado manualmente con `nx serve backend` + `curl`).

## 8. llm-client (`packages/ai`)

- [x] 8.1 Agregar `@anthropic-ai/sdk` como dependencia de `packages/ai`; escribir `packages/ai/src/errors.ts` (`LlmSchemaMismatchError`, `LlmUnavailableError`).
- [x] 8.2 Escribir `packages/ai/src/cache.ts`: memoización en memoria por hash de `(modelo + system + user + esquema)`.
- [x] 8.3 Escribir `packages/ai/src/llm-client.ts`: `AnthropicLlmClient implements LlmClient` con `completeJson`/`completeText` sobre `claude-haiku-4-5`, salida estructurada vía tool `strict: true` derivada del esquema zod, `cache_control: { type: 'ephemeral' }` en `system`, reintento único ante mismatch de esquema, sin `thinking: adaptive` ni `output_config.effort`; falla al construirse en `live` sin `ANTHROPIC_API_KEY` con mensaje en español.
- [x] 8.4 Tests con el SDK mockeado: dos llamadas idénticas → 1 invocación (REQ-LC-02); JSON inválido dos veces → 2 invocaciones + `LlmSchemaMismatchError` (REQ-LC-01); el request lleva `cache_control` en `system` y `model: 'claude-haiku-4-5'` sin `thinking` (REQ-LC-03/04); proveedor caído dos veces → `LlmUnavailableError` (REQ-LC-06).
- [x] 8.5 Verificar que con `AI_MODE=fake` se resuelve `FakeLlmClient` sin leer `ANTHROPIC_API_KEY` ni hacer red (REQ-LC-05); escribir el `README.md` de 10 líneas de `packages/ai`; correr `rg "@anthropic-ai/sdk" packages apps` y verificar que solo matchea en `packages/ai`.
- [x] 8.6 Correr `npx nx test ai` en verde.

## 9. frontend-shell — dependencias, cliente de API, usuario simulado

- [x] 9.1 Agregar `@tanstack/react-query` y `msw` a `apps/frontend`; correr `npx msw init apps/frontend/public --save` para generar el service worker.
- [x] 9.2 Escribir `apps/frontend/src/shared/user/` (contexto + hook de usuario simulado con los 4 usuarios de `users.json`, persistido en `localStorage`, invalida queries al cambiar) (REQ-FS-02).
- [x] 9.3 Escribir `apps/frontend/src/shared/api/` (`api.get/post/patch/delete/upload`, `ApiClientError`, agrega `x-user-id`, valida cada respuesta con zod) y los hooks de React Query por recurso con las claves de la tabla (REQ-FS-04).
- [x] 9.4 Verificar `rg "fetch\(" apps/frontend/src` solo matchea dentro de `shared/api`.

## 10. frontend-shell — mocks MSW

- [x] 10.1 Crear `apps/frontend/src/mocks/handlers/*.ts` (un archivo por feature: `me`, `bulls`, `needs`, `herd`, `matching`, `plan`, `advisor`, `chat`) que sirven `fixtures/samples/*` y el mismo formato de error; agregarlos en `apps/frontend/src/mocks/browser.ts`.
- [x] 10.2 Arrancar MSW condicionalmente en `main.tsx` si `VITE_MOCKS === 'true'`; verificar que I1/I2 pueden apagar un archivo de handlers sin afectar los demás (REQ-FS-05). (Cada feature tiene su propio array de handlers en `browser.ts`; apagar uno es comentar su spread, sin tocar los demás — verificado por lectura de código, no hay un caso de prueba automatizado para esto todavía.)

## 11. frontend-shell — shell, router, navegación

- [x] 11.1 Reemplazar `App.tsx`: montar `Shell`/`Sidebar`/`Topbar` de `components/ui` con los 5 módulos exactos de la tabla *Mapa de navegación*; eliminar la home del scaffold (REQ-FS-07).
- [x] 11.2 Implementar el router con una ruta por tab de la tabla, `/` → redirige a `/mercado`, `/ui-kit` se mantiene; barra de `Tabs` por módulo.
- [x] 11.3 Implementar los placeholders "pendiente" (Setup conversacional, Mis matches/mensajes, Cargar lotes/servicios) con `EmptyState` + `tag-version`, sin llamadas a la API (REQ-FS-08); `/establecimiento` muestra el nombre del tambo de `GET /me`.
- [x] 11.4 Implementar la tab "Panel del asesor" restringida a `ADVISOR`/`ADMIN`, con `EmptyState` explicativo para `FARMER` (REQ-FS-03).
- [x] 11.5 Implementar el selector de tambo en el `Topbar` para `ADVISOR`/`ADMIN` y el `farmId` activo derivado del usuario (único tambo para `FARMER`).
- [x] 11.6 Implementar el hueco del panel lateral del chat (colapsado, solo en `/motor-genetico/*`, `EmptyState` "Chat · pendiente") (REQ-FS-09).
- [x] 11.7 Crear `apps/frontend/src/features/_example/` con los 4 estados obligatorios (vacío, cargando, error, sin resultados) usando `EmptyState`/`Skeleton`/`ErrorMessage` sobre un hook de React Query (REQ-FS-06).
- [x] 11.8 Sin navegador disponible en este entorno de ejecución para el recorrido manual, se sustituyó por un test automatizado (`route-smoke.spec.tsx`) que monta las 10 rutas como `asesor-1` y `tambero-a` sobre `MemoryRouter`, confirma 5 ítems de sidebar en cada una y verifica el `EmptyState` de "Panel del asesor" para `tambero-a`; además se corrió `nx serve frontend` con `VITE_MOCKS=true` y se confirmó que sirve `index.html`, `main.tsx` y `mockServiceWorker.js` sin errores en el log. Ningún ítem del sidebar corresponde a una pantalla del MVP (son los 5 módulos, la pantalla vive en la tab).

## 12. Integración final y variables de entorno

- [x] 12.1 Agregar `ANTHROPIC_API_KEY`, `AI_MODE`, `DATABASE_URL` a `.env.example` (sin valores reales; se agregó también `VITE_MOCKS`, usada por `frontend-shell`) y confirmar que `.env` real no se commitea (`git check-ignore` lo confirma).
- [x] 12.2 **Conflicto de alcance detectado, no absorbido en silencio:** el criterio dice literalmente "`/mercado` muestra el saludo", pero la pantalla real de `/mercado` ("¿Qué necesitás?") es de `mvp-b-need`, y la sección "Queda afuera" de esta misma spec excluye construir cualquier pantalla real de flujo. Se verificó el circuito completo `VITE_MOCKS` apagado → proxy de Vite (`:4200/api`) → backend real (`:3333`) → `GET /me` con `curl`, devolviendo correctamente el usuario y `Tambo A (anonimizado)`. La única pantalla de esta spec que muestra el nombre por `GET /me` es `/establecimiento` (Setup conversacional, REQ-FS-08), que sí se implementó y verificó. No se construyó una pantalla de reemplazo en `/mercado`.
- [x] 12.3 Correr `npx nx run-many -t build test` en todo el repo y dejarlo en verde; documentar en el PR que el tag `contracts-v1` queda pendiente de creación manual por el equipo.
