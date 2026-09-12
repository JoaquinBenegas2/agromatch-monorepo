# mvp-a-core — El motor: matching genérico + vertical genético

> **Dueño: Dev A.** Es transversal y no se reparte: lo consumen los flujos de B, C y D. No tiene pantalla propia (salvo el anexo del chat).
>
> Fuente: `MASTER-HANDOFF.md` §6 y §9 (SPEC-CORE), `docs/plan-de-trabajo.md` M2, M3, A1–A6, C6, B7, D8, `docs/modelo-de-dominio.md` §6–§8, `docs/motor-datos-de-toros.md` §3, ADR-0001 y ADR-0002.

## Why

Todo lo que el producto promete —"un motor determinístico calcula quién te resuelve mejor y la IA explica por qué"— vive en dos paquetes de TypeScript puro: `matching-core` (filtros duros, score, compatibilidad relativa, registro de verticales) y `genetics-core` (cría esperada, caseínas, consanguinidad, parto, score genético y los hechos para la explicación). Hoy existen solo como stubs de `mvp-0-foundation`. Sin el motor real, los flujos de B y D muestran rankings inventados por el stub y la demo no sostiene ni el "#1 de 12" ni el rescate de la ternera 3031.

## What Changes

- `packages/matching-core`: reemplaza el stub por el motor genérico real — `hardFilters` (RN-31), `scoreCandidate` (RN-32), `matchNeed` (RN-33, reescalado 0–100 en un solo paso sobre todos los candidatos, genéricos o de vertical), `registerVertical` / `listVerticals` (RN-35). **No importa nada de `genetics-core`.**
- `packages/genetics-core`: reemplaza los stubs de A1–A5 y M3 por la lógica real — `deriveCategory`, `computeTraitStats`, `expectedProgeny`, `normalize`, `caseinOdds`, `inbreedingFilter`, `calvingEaseFilter`, `scoreOneCandidate`, `scoreCandidates`, `GOAL_PRESETS`, `toExplanationFacts` y `GeneticsVertical: VerticalEngine<ExplanationFacts>` (ADR-0002).
- Tests Vitest en los dos núcleos contra `herd-farm-a.json` y `bulls.seed.json`: son los criterios de aceptación de las tareas, escritos primero.
- Test de dependencias: `matching-core` no importa `genetics-core`.
- Test de neutralidad (RN-34): cambiar `company` en todos los toros deja el ranking idéntico.
- **P1, lo primero que se cae:** A6, catálogo real de 20–30 toros que reemplaza `bulls.seed.json` con el mismo esquema.
- **Anexo reasignable — Chat sobre el rodeo (C6 + B7 + D8):** `ChatPort` real con exactamente 3 herramientas de consulta, `POST /farms/:farmId/chat` y el panel lateral. P1.

**No cambia ninguna firma de `contracts-v1`.** Lo aditivo que se necesitó está marcado en *Preguntas abiertas* de la spec.

## Capabilities

### New Capabilities

- `core-engine`: el motor de matcheo genérico y el vertical genético como funciones puras, con los tests que sostienen la credibilidad del producto; más el chat sobre el rodeo como anexo reasignable.

### Modified Capabilities

Ninguna.

## Impact

- **Código:** `packages/matching-core/src/{filters,score,registry,index}.ts` + `test/`; `packages/genetics-core/src/{traits,category,casein,filters,matching/score,matching/presets,facts,vertical,index}.ts` + `test/`. Anexo: `packages/ai/src/chat.ts`, `apps/backend/src/chat/*`, `apps/frontend/src/features/chat/*`.
- **Contratos:** consume `@org/shared-types` tal como quedó en `contracts-v1`. No renombra ni borra nada.
- **Fixtures:** A6 reemplaza `bulls.seed.json` por `bulls.json` con el mismo esquema y `source` real por toro.
- **Fuera de alcance explícito:** `classifyHerd` / `classifyHerdClassic` (los hace C en `mvp-c-herd`), `makeGeneticsNeed` / `buildAutoPlan` (los hace D en `mvp-d-match`), cualquier endpoint o pantalla que no sea el anexo del chat.

## Dependencias con otras specs

| Dirección | Spec | Qué |
|---|---|---|
| Depende de | `mvp-0-foundation` | Contratos, stubs con la firma final, fixtures, `LlmClient`, `api-skeleton` (para el anexo) |
| La consume | `mvp-c-herd` | `deriveCategory` (C2), `computeTraitStats` y `normalize` (B2 los usa para el percentil de CI) |
| La consume | `mvp-d-match` | `scoreOneCandidate`, `scoreCandidates`, `toExplanationFacts`, `GeneticsVertical`, `GOAL_PRESETS`, `matchNeed` + `registerVertical` (B4 pasa por `matchNeed` con el vertical registrado, ADR-0002), `expectedProgeny` (B5) |
| La consume | `mvp-b-need` | `hardFilters`, `scoreCandidate`, `matchNeed` (M5) |
| Integración | I1 (hora 9) | B2 de C usa `computeTraitStats` real |
| Integración | I2 (hora 13) | B4 de D usa `matchNeed` + `GeneticsVertical` reales; M5 de B usa `matchNeed` real |
