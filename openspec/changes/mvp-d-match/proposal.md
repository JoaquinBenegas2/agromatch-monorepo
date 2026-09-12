# mvp-d-match — Matching genético → explicación → plan

> **Dueño: Dev D.** Flujo de punta a punta: API y pantalla. Es el paso 4 de la narración del MVP (`baseline.md` §1b) y el hito **I2** (hora 13: F3 + F4 reales).
>
> Fuente: `MASTER-HANDOFF.md` §6 y §9 (SPEC-FLOW-MATCH), `docs/plan-de-trabajo.md` C4, B4, D4, B5, D5, C5, `docs/modelo-de-dominio.md` F3 y F4, ADR-0002. **Fuente visual:** `AgroMatch Motor Genetico.dc.html` y `designs/01-sidebar-scaffolding.html` (PR #11), que mandan sobre `docs/pantallas.md` §3.4 y §3.5.

## Why

Es la pantalla estrella de la demo: la ternera **3031** (que las reglas clásicas mandaban a carne por mastitis) se rescata con un toro de SCS bajo y la IA explica por qué. Ahí se demuestran las tres promesas del producto en una sola tarjeta: el motor calcula, la IA solo redacta sobre hechos, y lo que se elige se convierte en un plan que el productor le pasa al inseminador. Sin este flujo, el vertical (lo que retiene, N5) no existe.

## What Changes

- **Explicador con control de alucinación (C4):** `ExplainerPort` real sobre `LlmClient`. Prompt en rioplatense, 3–4 oraciones, sin jerga. Cada número del texto tiene que existir en los hechos; si no, se muestra el texto determinístico de `reasons` con `source: 'FALLBACK'`.
- **Endpoints de matching y explicación (B4, según ADR-0002):** `POST /farms/:farmId/females/:femaleId/matches` arma un `Need` sintético con `makeGeneticsNeed`, proyecta los toros del tier a `Capability` y llama a `matchNeed` de `matching-core` con `GeneticsVertical` registrado. **Nunca llama a `scoreCandidates` directo.** `POST .../matches/:naab/explanation` cachea por hash de los hechos.
- **Matching genético (D4), variante sin swipe:** tab "Matching genético" del módulo "Motor genético" (`/motor-genetico/matching/:femaleId?`) con el layout del mockup: barra de objetivo (texto libre + presets + "Subir Excel" + "Procesar"), ficha fija oscura de la hembra, lista de toros con badge de match expandible (`#k de N · compatibilidad`, nunca "95% match"), cría esperada contra la madre en barras y tabla, probabilidades A2/BB, filtros, explicación de la IA con indicador, "Elegir para el plan" (no "Iniciar trato": N8) y excluidos inline con el motivo. Reemplaza al swipe tipo Tinder de `pantallas.md §3.4`.
- **Plan de servicios (B5 + D5):** `buildAutoPlan` en `genetics-core` (el mejor toro para cada hembra clasificada que no esté en `CULL_ALERT`), endpoints `plan/*` con export CSV (UTF-8 con BOM) y la tab "Plan de servicios" del módulo "Negociación y tratos" (`/negociacion/plan`) con totales.
- **Objetivo en lenguaje natural (C5):** `GoalParserPort` real + `POST /goals/parse`; los pesos se validan y se normalizan a suma 1, nunca error. P1: si aprieta, el objetivo queda solo con presets.

**Corrección de reparto:** B5 (endpoints del plan) pasa de Dev B a Dev D. El flujo "swipe → explicación → plan" no puede cruzar dos devs.

## Capabilities

### New Capabilities

- `flow-match`: elegir toro para cada hembra clasificada (F3) y armar el plan de servicios (F4): explicador con control de alucinación, matching enchufado al núcleo, swipe, plan automático y manual, export CSV y objetivo en lenguaje natural.

### Modified Capabilities

Ninguna.

## Impact

- **`packages/ai`:** `src/explainer.ts` (C4), `src/goal-parser.ts` (C5), `src/validate-numbers.ts`.
- **`packages/genetics-core`:** `src/planning/auto-plan.ts` (B5, reemplaza el stub de `buildAutoPlan`), `src/need.ts` (`makeGeneticsNeed`, reemplaza el stub).
- **`apps/backend`:** módulos `matching/` (B4) y `planning/` (B5), más `goals/` para `POST /goals/parse`. Cambia dos líneas de `ai/ai.providers.ts`: `EXPLAINER_PORT` y `GOAL_PARSER_PORT`.
- **`apps/frontend`:** `features/matching/*` (D4) y `features/plan/*` (D5), como contenido de las tabs que `frontend-shell` ya enruta. Apaga sus handlers de MSW en I2.
- **Contratos:** solo consume lo de `mvp-0-foundation`. Un aditivo posible (`Need.synthetic`) se marca como pregunta abierta.

## Dependencias con otras specs

| Spec | Tipo | Qué necesita |
|---|---|---|
| `mvp-0-foundation` | **Dura** | Contratos, `api-skeleton` (guard, errores, `ai.providers.ts`), `llm-client`, `frontend-shell` (sidebar de 5 módulos, barra de tabs, rutas `/motor-genetico/matching/:femaleId?` y `/negociacion/plan`, cliente tipado, MSW) |
| `mvp-c-herd` | **Dura en runtime** | Tiene que existir una clasificación del tambo para la hembra: si no, `POST /matches` responde 409 `HERD_NOT_CLASSIFIED`. Durante el desarrollo se usa el stub de `classifyHerd` y el fixture `samples/classifications.json` |
| `mvp-a-core` | **Blanda (I2)** | `scoreOneCandidate`, `toExplanationFacts`, `GOAL_PRESETS` (A4, A5), `matchNeed`/`registerVertical` (M2) y `GeneticsVertical` (M3). Hasta I2, los stubs de T0 |
| `mvp-b-need` | **Entrada** | La Home del mercado redirige a `/motor-genetico/matching` cuando la necesidad es `GENETICS`. D no depende de B: la ruta existe desde `frontend-shell` |
| `mvp-c-herd` | **Entrada / salida** | El Tablero del rodeo navega a `/motor-genetico/matching/:femaleId` al hacer clic en una hembra; el botón "Subir Excel" de la barra navega a `/motor-genetico/importar` |
