# tasks — mvp-a-core (Dev A: el motor)

> Generado a partir de `proposal.md` + `specs/core-engine/spec.md` (REQ-A-01 a REQ-A-11, REQ-A-CHAT-01 a 03). Orden: A1 → A2+A3 → M2 → A4 → A5 → M3, anexo (C6+B7+D8) al final. Una PR por hito, ramas encadenadas desde `feature/A1-A2-A3-genetics-base` (todas salen de `origin/develop`).

## Hito 1 — Base del motor genético (A1 + A2 + A3)
Rama: `feature/A1-A2-A3-genetics-base` (base: `develop`)

- [ ] A1 · `genetics-core/src/traits.ts`: `computeTraitStats`, `expectedProgeny`, `normalize` (REQ-A-04)
- [ ] A1 · `genetics-core/src/category.ts`: `deriveCategory` (REQ-A-04)
- [ ] A2 · `genetics-core/src/casein.ts`: `caseinOdds` (REQ-A-05)
- [ ] A3 · `genetics-core/src/filters.ts`: `inbreedingFilter`, `calvingEaseFilter` (REQ-A-06)
- [ ] Relocar `classifyHerd`/`classifyHerdClassic`/`makeGeneticsNeed`/`buildAutoPlan` (stubs intactos, fuera de alcance de A) a `legacy-stubs.ts` sin tocar su lógica
- [ ] `index.ts` re-exporta todo; ningún import externo se rompe
- [ ] Tests Vitest: `test/traits.spec.ts`, `test/category.spec.ts`, `test/casein.spec.ts`, `test/filters.spec.ts` — escritos antes de la implementación (TDD)
- [ ] `test/legacy-stubs.spec.ts`: mueve los tests existentes de classifyHerd/buildAutoPlan sin cambiar aserciones

Criterios (de la spec): expectedProgeny.milk===299.5 · normalize invierte signo en scs/rfi · deriveCategory 11/12/30/31 meses · computeTraitStats(herd-farm-a).mean.ci≈412.9±0.1 · caseinOdds 1/0.5/0.25/0/null · inbreedingFilter 25%/12.5%/sin-padre · calvingEaseFilter HEIFER>2.5 o null → no pasa, COW pasa siempre.

## Hito 2 — Motor de matcheo genérico (M2)
Rama: `feature/M2-matching-core` (base: `feature/A1-A2-A3-genetics-base`)

- [ ] **Primero**: test de dependencias — `matching-core` no importa `genetics-core` (estático, sobre el árbol de imports)
- [ ] `matching-core/src/filters.ts`: `hardFilters` real (RN-31): categoría, radio (haversine ya existe), ventana, capacidad, certificaciones `cert:*`
- [ ] `matching-core/src/score.ts`: `scoreCandidate` real (5 componentes, pesos `0.35/0.20/0.15/0.15/0.15` — Q3) + `matchNeed` (reescalado min-max en un solo paso, RN-33, ADR-0002)
- [ ] `matching-core/src/registry.ts`: `registerVertical`, `listVerticals` (ya correctos en el stub, revisar y mover)
- [ ] `index.ts` re-exporta todo
- [ ] Tests: `test/filters.spec.ts`, `test/score.spec.ts`, `test/match-need.spec.ts`, `test/dependencies.spec.ts`

Criterios: 180km/120km excluido · 40ha/5 toneladas ha/día excluido · sin superposición excluido · sin reputación → reputation:0 con reason · el más cercano/disponible/mejor calificado #1 con 100 · un solo candidato → 100 · sin LLM en las deps.

## Hito 3 — Matching genético y su enchufe (A4 + A5 + M3)
Rama: `feature/A4-A5-M3-genetics-vertical` (base: `feature/M2-matching-core`)

- [ ] A4 · `genetics-core/src/matching/presets.ts`: `GOAL_PRESETS` (pesos suman 1, tabla de la spec)
- [ ] A4 · `genetics-core/src/matching/score.ts`: `scoreOneCandidate` real (RN-13, RN-09/ADR-0001 correctivo×2, faltantes→0) y `scoreCandidates`
- [ ] A5 · `genetics-core/src/facts.ts`: `toExplanationFacts` + `ToExplanationFactsInput` (aditivo, Q1)
- [ ] M3 · `genetics-core/src/vertical.ts`: `GeneticsVertical: VerticalEngine<ExplanationFacts>` + `GeneticsMatchContext` (aditivo)
- [ ] Reemplazar en `legacy-stubs.ts` las llamadas a las versiones reales (buildAutoPlan sigue llamando `scoreCandidates`, ahora real)
- [ ] Actualizar `test/legacy-stubs.spec.ts` donde el comportamiento stub-específico ya no aplica (scoreCandidates dejó de ordenar por CI crudo)
- [ ] Tests: `test/matching-score.spec.ts` (3031, neutralidad RN-34, catálogo por tier, CULL_ALERT vacío, rasgo faltante, correctivos acumulados, toros de carne), `test/facts.spec.ts` (invariante RN-18, snapshot 3031), `test/vertical.spec.ts` (canHandle, mismo resultado por los dos caminos)

Criterios: 3031+SOLIDS_CHEESE → #1 SCS≤2.80, cría<3.00 · hijos de 029HO19531 excluidos por RN-05 · neutralidad · compatibility #1=100 · correctivos acumulados no dominan · rasgo faltante→0 con reason · carne por calvingEase→breed→precio · invariante RN-18 tolerancia 0.05 · GeneticsVertical.score delega en scoreOneCandidate y da el mismo MatchBoard que scoreCandidates.

## Hito 4 — Anexo del chat (C6 + B7 + D8) — P1, reasignable
Rama: `feature/C6-B7-D8-chat-annex` (base: `feature/A4-A5-M3-genetics-vertical`)

- [ ] C6 · `packages/ai/src/chat.ts`: `ChatPort` real sobre `LlmClient`, 3 herramientas `strict:true` (`countByTier`, `listFemales`, `explainClassification`)
- [ ] B7 (mitad) · `apps/backend/src/chat/*`: `POST /farms/:farmId/chat`, `HerdQueryTools` sobre `FemaleRepo`/`ClassificationRepo`, 403 aislamiento, 409 `HERD_NOT_CLASSIFIED`
- [ ] D8 · `apps/frontend/src/features/chat/*`: panel lateral en `frontend-shell` (REQ-FS-09), `ChatThread`/`ChatBubble`/`ChatComposer`, `FALLBACK` visible
- [ ] Verificación manual (no hay tests de núcleo aquí): con `FakeChat` y luego con Claude en vivo, según checklist de la spec

**P1 — si el tiempo no alcanza, se cae primero.** No bloquea I1/I2 del resto del equipo.

## A6 — Catálogo real de toros (P1, lo primero que se cae junto al anexo)
- [ ] `packages/shared-types/fixtures/bulls.json`: 20-30 toros reales (ABS/Genex/Semex Argentina × CDCB), padres del rodeo, ≥2 hijos de `029HO19531`, A2/A2 y BB, 4 de carne
- [ ] Test: valida contra `BullSchema`, cobertura de padres del rodeo

## Notas de ejecución
- Ramas encadenadas (stacked): cada PR se abre contra la rama anterior, no contra `develop` directamente, salvo la primera. Se anota explícitamente en la descripción de cada PR.
- `git add` explícito: solo `packages/matching-core` y `packages/genetics-core` (+ `packages/ai`, `apps/backend/src/chat`, `apps/frontend/src/features/chat` en el Hito 4). Nunca `-A`.
- Notion: `Doing` al arrancar cada tarea (A1, A2, A3, M2, A4, A5, M3, C6, B7, D8), `Done` cuando sus tests están en verde (o, para el anexo, verificado a mano), `Waiting` si se traba más de 20 min.
