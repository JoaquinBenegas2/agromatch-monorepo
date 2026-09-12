## Context

Ver `proposal.md` (Why) y `specs/flow-match/spec.md` (Contratos, REQ-D-01 a REQ-D-15) para el qué y el porqué — no se repiten acá. Este documento cubre el cómo, apoyado en lo que `mvp-0-foundation` (T0, PR #14) ya dejó construido y verificado en el repo:

- **Backend**: `apps/backend/src/app/{matching,planning}` existen como carpetas vacías (`.gitkeep`). `FarmAccessGuard`, `CurrentUser`, `DomainError`, `ApiExceptionFilter` y los repos (`FemaleRepo`, `ClassificationRepo`, `NeedRepo`, `BullRepo`, `PlanRepo`) ya están implementados y probados. `AI_PROVIDERS` ya tiene los tokens `EXPLAINER_PORT` y `GOAL_PARSER_PORT` apuntando a sus fakes — solo hay que cambiar esas dos líneas.
- **Core**: `packages/matching-core.matchNeed/registerVertical` y `packages/genetics-core.{scoreOneCandidate, scoreCandidates, GOAL_PRESETS, GeneticsVertical, makeGeneticsNeed, buildAutoPlan}` existen como stubs con firma final (T0). `makeGeneticsNeed` y `buildAutoPlan` son míos (B5); el resto lo reemplaza `mvp-a-core` en I2 — hasta entonces trabajo contra el stub, tal como dice la spec.
- **Frontend**: `AppShell` + `<Outlet/>` + `ModulePage` (dispatcher genérico por `nav.ts`) ya están. Mis dos tabs (`/motor-genetico/matching`, `/negociacion/plan`) están en `nav.ts` con `status: 'not-implemented', spec: 'mvp-d-match'`. `queryKeys.matches`, `queryKeys.explanation` y `queryKeys.plan` **ya están definidos** en `shared/api/keys.ts` con la forma exacta que pide REQ-D-05. `api.{get,post,delete}` ya inyecta `x-user-id` y valida con zod. Los 9 componentes compartidos (`OfferCard`, `ComparisonBar`, `AiExplanation`, `ScoreBadge`, `EmptyState`, `Skeleton`, `ErrorMessage`, `Table`, `FilterChips`) y el resto de `components/ui` ya existen.

## Goals / Non-Goals

**Goals:**
- Reemplazar los dos stubs de `genetics-core` que me tocan (`makeGeneticsNeed`, `buildAutoPlan`) sin tocar su firma.
- Cablear `matching`, `planning` y `goals` en `apps/backend`, consumiendo `matchNeed`/`GeneticsVertical` tal como están hoy (stub), para que el I2 de `mvp-a-core` sea un cambio de una sola pieza (nadie más toca mis endpoints).
- Reemplazar el `<Outlet/>` genérico de mis dos rutas por componentes reales, sin tocar `AppShell`, `ModuleTabBar` ni `nav.ts` (el ruteo específico de React Router ya gana por especificidad sobre `/motor-genetico/*`).

**Non-Goals:**
- No implemento el motor real (eso es `mvp-a-core`). Los tests de matching que dependen de scoring real quedan marcados `.skip` con un comentario `// mvp-a-core I2` hasta que el vertical deje de ser stub — no se simula un motor falso dentro de mi código para "hacer pasar" el test.
- No toco `frontend-shell` (sidebar, tab bar, guard de roles): ya resuelve REQ-FS-01/03 por mí.
- No implemento "Mis matches / mensajes" (placeholder del shell, N8) ni el chat (anexo de `mvp-a-core`).

## Decisiones

### D1 — Un módulo Nest por carpeta ya scaffoldeada, sin módulo nuevo para `goals`
`MatchingModule` (`app/matching`) y `PlanningModule` (`app/planning`) reusan las carpetas que T0 dejó. `POST /goals/parse` es un solo endpoint sin estado ni repo propio: en vez de crear `app/goals/` (T0 no la scaffoldeó, a diferencia de `matching`/`planning`), vive como controlador dentro de `PlanningModule` (`goals.controller.ts`), porque el objetivo en lenguaje natural es un insumo del plan y del matching por igual y no amerita su propio módulo Nest. Ambos módulos se agregan a `AppModule.imports`.

### D2 — El endpoint de matching arma el contexto y llama a `matchNeed`, nunca al vertical directo (REQ-D-01)
**Corrección sobre `specs/flow-match/spec.md`, aplicada al implementar B4 (PR #21):** la spec describe `GeneticsMatchContext` como `{ female, classification, farm, stats, bullsByNaab }`, pero el `GeneticsVerticalContext` que T0 dejó realmente implementado en `packages/genetics-core/src/lib/genetics-core.ts` (el que `GeneticsVertical.score` ya castea) es `{ female, classification, bulls: Bull[], stats }` — sin `farm`, con `bulls` como array, no como diccionario. La spec se escribió antes de que existiera el código; la implementación sigue el contexto real, que es el que `matchNeed` reenvía tal cual al vertical, en vez de uno que el vertical no leería. Tampoco hace falta `Farm`: `computeTraitStats` solo pide `GenomicProfile[]`, que sale de `FemaleRepo.listByFarm(farmId)`.

`MatchingService.getBoard(farmId, femaleId, goal)`:
1. `FemaleRepo.findById` + `ClassificationRepo.listByFarm` → si no hay clasificación vigente para esa hembra (o `semenType` es `null`, caso `CULL_ALERT`), `DomainError('HERD_NOT_CLASSIFIED', ..., 409)` (REQ-D-02).
2. `makeGeneticsNeed(farmId, femaleId, goal)` para obtener (o reconstruir) el `Need` sintético.
3. `BullRepo.list()` filtrados por `semenTypes.includes(classification.semenType)`.
4. `ProviderRepo.listCapabilities({ category: 'GENETICS' })` — **ya vienen pre-armadas por central** en el seed de T0 (`id = naab`, `providerId` = la central real), filtradas a los naabs de los toros del paso 3. No hace falta proyectar `Bull → Capability` a mano.
5. `ProviderRepo.list({ category: 'GENETICS' })` para las centrales.
6. `computeTraitStats(profiles)` (stub de `genetics-core`, real en `mvp-a-core` A1) sobre los perfiles del rodeo del tambo.
7. `matchNeed(need, caps, provs, [GeneticsVertical], { female, classification, bulls, stats })` — **el único punto donde se llama al núcleo**.

`MatchingController` no tiene lógica: valida el body con `BreedingGoalSchema`, delega en el service y deja que `ApiExceptionFilter` traduzca `DomainError`.

### D3 — Need sintético: persistido con `synthetic: true`, reutilizado por hash (REQ-D-03, Q1 ya resuelta)
`makeGeneticsNeed` no llama a un repo (es una función pura de `genetics-core`, no puede: no conoce Nest ni Prisma). La persistencia vive en `MatchingService`: antes de llamar a `matchNeed`, hace `NeedRepo.findById(hash(farmId, femaleId))` — usa un id determinístico (`` `synthetic:${farmId}:${femaleId}` ``) en vez de un UUID random, así "buscar" y "crear" son la misma operación idempotente sin necesitar una columna nueva de búsqueda. Si no existe, `NeedRepo.create({ ...need, id: thatId, synthetic: true })`. `NeedRepo.listByFarm` ya excluye `synthetic` por defecto (T0, Q1).

### D4 — Explicación: cache en memoria por hash de hechos (REQ-D-05), reusando `InMemoryCache` de `packages/ai`
`ExplanationService` usa una instancia de `InMemoryCache<Explanation>` (ya existe en `packages/ai/src/lib/cache.ts`, la misma clase que usa `llm-client` para memoizar) con `cache.key(facts)` como clave — determinístico porque `JSON.stringify` con claves ordenadas. `getOrCompute` evita la doble invocación del `ExplainerPort` en el caso "dos llamadas iguales" del REQ-D-05 sin agregar infraestructura nueva (nada de Redis para un MVP de 20h). Vive en memoria del proceso; se pierde al reiniciar, aceptable para la demo.

### D5 — `ExplainerPort`/`GoalParserPort` reales van en `packages/ai`, wire-up en `ai.providers.ts` (dos líneas)
`AnthropicExplainer` y `AnthropicGoalParser` se agregan a `packages/ai/src/lib/` junto a `llm-client.ts`, mismo patrón (constructor recibe `LlmClient`, usa `completeText`/`completeJson`). `validateNumbers` es una función pura exportada de `packages/ai` (sin estado), consumida por `AnthropicExplainer.explain` antes de devolver `source: 'AI'`. En `apps/backend/src/ai/ai.providers.ts` cambian únicamente estas dos líneas:
```ts
{ provide: EXPLAINER_PORT, useFactory: (llm: LlmClient) => new AnthropicExplainer(llm), inject: [LLM_CLIENT] },
{ provide: GOAL_PARSER_PORT, useFactory: (llm: LlmClient) => new AnthropicGoalParser(llm), inject: [LLM_CLIENT] },
```
Nadie más toca ese archivo en paralelo: son líneas dedicadas a mis dos puertos (mismo patrón que ya usan los otros 4 puertos fake, comentario "real de mvp-d-match" ya escrito por T0).

### D6 — Frontend: rutas literales dentro de `<Route element={<AppShell />}>`, no toco `ModulePage`
En `app.tsx`, agrego (antes del catch-all `/motor-genetico/*` y `/negociacion/*`, aunque React Router ya rankea por especificidad y el orden no importa):
```tsx
<Route path="/motor-genetico/matching/:femaleId?" element={<MatchingScreen />} />
<Route path="/negociacion/plan" element={<PlanScreen />} />
```
`ModulePage` y `nav.ts` quedan sin cambios: `ModuleTabBar` sigue leyendo `nav.ts` para pintar la barra de tabs (no le importa qué elemento renderiza `<Outlet/>`), y como mis rutas son más específicas que `/motor-genetico/*`, ganan sin tocar el catch-all de los otros devs.

`features/matching/` y `features/plan/` siguen el patrón de `shared/api/hooks/*`: un hook por request (`use-match-board.ts`, `use-explanation.ts`, `use-plan.ts`, `use-plan-item-mutations.ts`, `use-goal-parse.ts`), usando los `queryKeys` que T0 ya definió. `goalHash` = `cache.key(goal)` del mismo helper que el backend (se duplica la función `hashGoal` — 4 líneas — en vez de compartirla entre front y back, porque cruzar esa frontera para una función tan chica no vale la dependencia nueva).

### D7 — `#k de N · compatibilidad`: `ScoreBadge` no alcanza, es texto plano con `Popover`/expand controlado por estado local
`ScoreBadge` (`components/ui/score-badge.tsx`) solo pinta un número con tier de color — no arma el texto "#k de N". La fila de la lista usa `OfferCard` con `rank={{ position, total }}` (ya soportado, RN-15) más un botón "Ver detalle" que controla un `expanded: boolean` en estado local del componente `MatchRow` (no en la URL: no hace falta deep-linkear una fila expandida para el MVP). La primera fila arranca `expanded=true` (Q3). Expandir dispara `useExplanation` (con `enabled: expanded`) y, al expandir, `queryClient.prefetchQuery` de la fila siguiente (Q4).

## Riesgos / Trade-offs

- **[Riesgo] El endpoint de matching no tiene motor real hasta I2** → Mitigación: contrato y forma de `MatchBoard` no cambian entre stub y real (mismo `matchNeed`), así que el front y los tests de integración manual no necesitan tocarse cuando `mvp-a-core` reemplace el stub — solo cambian los números.
- **[Riesgo] `InMemoryCache` no persiste entre reinicios del backend** → Aceptado: es un MVP de demo en vivo de 20h, no un caché de producción; está documentado en el propio `cache.ts` de T0.
- **[Riesgo] Duplicar `hashGoal` entre `apps/backend` y `apps/frontend`** → Mitigación: es una función de 4 líneas (`JSON.stringify` con claves ordenadas de `goal.preset` + `goal.weights`); si diverge, el peor caso es un cache-miss extra, nunca un dato incorrecto.
- **[Trade-off] `POST /goals/parse` vive en `PlanningModule` en vez de su propio módulo** → Se documenta acá para que si un futuro dev busca `goals.controller.ts` lo encuentre en `app/planning/`, no en una carpeta `app/goals/` que no existe.

## Plan de despliegue

No aplica migración de datos: `Need.synthetic` y los campos de `PlanItem`/`BreedingPlan` ya están en el schema de Prisma desde T0. Cada PR de este change se mergea a `develop` con sus tests en verde; no hay rollback especial más allá de revertir el merge (sin datos de producción en juego).
