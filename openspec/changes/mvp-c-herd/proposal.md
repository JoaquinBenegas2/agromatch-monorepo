# mvp-c-herd — Excel → rodeo clasificado

> **Dueño: Dev C.** Es el flujo del hito **I1** (hora 9): F1 + F2 reales de punta a punta, subiendo el Excel real, mapeando con el LLM y clasificando 293 animales con `classifyHerd` real. Es el primer flujo que se integra y el que sostiene el número del pitch: **"con las reglas clásicas, el 47% iba a carne; acá, el 30%"**.
>
> Fuente: `MASTER-HANDOFF.md` §6 y §9 (SPEC-FLOW-HERD), `baseline.md` §1b paso 3, `docs/plan-de-trabajo.md` (C2, B2, B3, D2, D3), `docs/modelo-de-dominio.md` (F1, F2, RN-07 a RN-12, RN-19, RN-24), `docs/pantallas.md` §3.2 y §3.3, ADR-0001, `docs/analisis-idea-04-matching-reproductivo.md` §3.

## Why

El productor tiene un Excel de genotipado que nunca supo leer. Este flujo lo convierte, en segundos y con confirmación humana, en un rodeo con cada hembra clasificada en sexado, convencional, carne o alerta, con los motivos a la vista. Sin esto no hay vertical: el swipe (`mvp-d-match`), el panel del asesor y el chat consumen las hembras y las clasificaciones que se producen acá. Y es el momento del pitch en que el jurado ve que el motor **calcula y corrige** en lugar de listar.

## What Changes

- **Ingesta del rodeo (C2):** `HerdIngestionPort` real en `packages/ai`: detección de la fila de encabezados con SheetJS, propuesta de mapeo de columnas por el LLM con confianza por columna, aplicación del mapeo confirmado con descarte de filas vacías y de notas, validación de rangos, aviso de hembras sin padre, `deriveCategory` y `scale: 'CDCB'`. Endpoints `POST /farms/:farmId/herd-imports` y `POST /farms/:farmId/herd-imports/:importId/confirm` en el módulo `herd-import`.
- **Clasificación (B2):** `classifyHerd` real en `packages/genetics-core/src/classification`, con la precedencia RN-12 y la zona gris de ADR-0001. Más `classifyHerdClassic`, que reproduce las reglas del documento de mercado solo para calcular la comparación "47% vs 30%".
- **Endpoints de clasificación y hembras (B3):** `POST /farms/:farmId/classifications`, `GET /farms/:farmId/classifications/summary`, `GET /farms/:farmId/females` en los módulos `classification` y `herd`.
- **Pantalla de carga (D2):** tab "Carga del rodeo" del módulo **Motor genético**, `/motor-genetico/importar` en `features/herd-import`: soltar el archivo → tabla de mapeo editable con confianza en color → resultado → redirige al Tablero. Se llega también por el botón "Subir Excel" de la barra del módulo (compartido con D4) y por el estado vacío del Tablero.
- **Tablero del rodeo (D3):** tab "Tablero del rodeo" del módulo **Motor genético**, `/motor-genetico/tablero` en `features/herd`: tarjetas por tier, selector de objetivo y "Clasificar", la comparación clásico vs. Torinder, chips de filtro, tabla con motivos desplegables y navegación a `/motor-genetico/matching/:femaleId`.

La navegación sigue el sidebar de 5 módulos de PR #11 (`designs/01-sidebar-scaffolding.html`, `AgroMatch Motor Genetico.dc.html`) y el mapa de `mvp-0-foundation/specs/frontend-shell`: ninguna de las dos pantallas es un ítem del sidebar. El contenido sigue `pantallas.md §3.2`/`§3.3` porque todavía no tienen mockup propio.

Los stubs de `mvp-0-foundation` se reemplazan por el cuerpo real **sin cambiar la firma**.

## Capabilities

### New Capabilities

- `flow-herd`: carga asistida del rodeo desde Excel y clasificación por tiers del vertical genético, con sus endpoints y sus dos pantallas.

### Modified Capabilities

Ninguna.

## Impact

- **`packages/ai`:** `src/herd-ingestion.ts` (adaptador real sobre `LlmClient`), dependencia `xlsx` (SheetJS, ya instalada por la semilla).
- **`packages/genetics-core`:** `src/classification/*.ts` reemplaza el stub de `classifyHerd`; se agrega `classifyHerdClassic`. Tests Vitest en `test/classification.test.ts` con `herd-farm-a`.
- **`apps/backend`:** módulos `herd-import`, `herd`, `classification`. Cambia una línea en `ai.providers.ts` (`HERD_INGESTION_PORT` → adaptador real). Usa `HerdImportRepo`, `FemaleRepo`, `ClassificationRepo`, `FarmRepo`.
- **`apps/frontend`:** `features/herd-import/*` (incluye el botón "Subir Excel" que D4 reutiliza), `features/herd/*`, montadas en las tabs de `/motor-genetico/*` que deja `frontend-shell`. Sus handlers de MSW se apagan en I1.
- **Contratos:** no cambia ninguna firma. Aditivos ya previstos en `mvp-0-foundation` (`classifyHerdClassic`, `ClassificationSummary.classicRulesBeefCount` y `withoutProfile`).

## Dependencias con otras specs

| Dirección | Spec | Qué |
|---|---|---|
| Depende (dura) | `mvp-0-foundation` / `shared-contracts`, `api-skeleton`, `frontend-shell` | Tipos, `HerdImportRepo`, `UserGuard`, errores, cliente tipado, MSW, y las rutas/tabs `/motor-genetico/importar` y `/motor-genetico/tablero` del módulo Motor genético |
| Comparte con | `mvp-d-match` (D4) | La barra de tabs del módulo Motor genético y el botón "Subir Excel" (lo arma C en `features/herd-import/`, D lo importa) |
| Depende (dura) | `mvp-0-foundation` / `llm-client` | `LlmClient` para proponer el mapeo. Lo hace el mismo Dev C (C1) antes de C2 |
| Depende (blanda) | `mvp-a-core` (A1) | `deriveCategory` y `computeTraitStats`: se usa el stub de T0 hasta I1 |
| Produce para | `mvp-d-match` (B4, B5) | `Female` con `profile` y `Classification` por hembra: el swipe pide 409 `HERD_NOT_CLASSIFIED` si no existen |
| Produce para | `mvp-b-need` (anexo asesor, B6) | `Female` y `Classification` guardadas por tambo: el anexo arma `FarmSummary` desde `FemaleRepo` y `ClassificationRepo`, no desde el endpoint de resumen |
| Produce para | `mvp-a-core` (anexo chat, B7/C6) | `HerdQueryTools` lee hembras y clasificaciones de este flujo |
