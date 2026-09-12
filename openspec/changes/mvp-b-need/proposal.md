# mvp-b-need — Necesidad → proveedores

> **Dev B.** Es la puerta de entrada del producto: la caja "¿Qué necesitás?" que interpreta, confirma, matchea y solicita. Incluye, como anexo reasignable, el panel del asesor (B6 + D6).
>
> Fuente: `MASTER-HANDOFF.md` §6 y §9 (SPEC-FLOW-NEED), `baseline.md` §1b pasos 1, 2 y entrada al 3, `docs/plan-de-trabajo.md` M4–M7, B6, D6, `docs/modelo-de-dominio.md` §6, §9 (N1–N5), `docs/pantallas.md` §3.1 y §3.6, ADR-0002.

## Why

La demo arranca por acá: el productor escribe *"necesito quien me are 40 hectáreas en Río Cuarto la semana que viene"*, ve lo que el sistema entendió, lo corrige, confirma y recién entonces aparecen los contratistas **ordenados por cuánto le sirven a él, no por quién pagó**, con los excluidos y su motivo al lado. Y la tercera necesidad de la demo — *"quiero mejorar los sólidos de mi tambo"* — es la que lo lleva al vertical. Sin este flujo, no hay entrada al producto ni transición al motor genético. Hoy hay contratos y un shell; no hay intake, ni endpoints de necesidades, ni pantalla.

## What Changes

- **Intake con IA (M4):** `NeedIntakePort` real sobre `LlmClient`: texto libre → `Need` en `DRAFT`, con confianza por campo y campos faltantes marcados. Nunca inventa fecha ni lugar. Incluye la corrección aditiva de `contracts-v1` para que `where` y `window` puedan estar ausentes únicamente antes de confirmar.
- **API del núcleo (M5):** `POST /needs`, `PATCH /needs/:id` (confirmar → `OPEN`), `GET /needs`, `POST /needs/:id/matches` → `MatchBoard`, `GET /providers` (sin contacto), `POST /needs/:id/requests` → `ServiceRequest` (con contacto), `POST /requests/:id/review`. Módulos `needs/`, `providers/`, `matching/`, `requests/`.
- **Pantalla "Home marketplace general" (M6):** `features/market/`, ruta `/mercado`, tab única del módulo "Mercado y oportunidades" del sidebar de 5 módulos (`AgroMatch Home Conversacional.dc.html`, PR #11). Tres estados: cero (saludo + caja conversacional + chips) → ficha "Lo que AgroMatch entendió" editable → resultados en grilla de `OfferCard` (ranking "#n de N", badge de verificación, explicación con indicador, "Pedir fecha") + excluidos con motivo. Si la categoría es `GENETICS`, lleva al motor genético (`/motor-genetico/matching`).
- **Proveedores semilla reales (M7, P1):** ~30 proveedores públicos de maquinaria y veterinaria, más las centrales de semen como proveedores de `GENETICS`, todos `verified: false` y con `source`.
- **Anexo reasignable — Panel del asesor (B6 + D6, P1):** `GET /advisor/overview` → `FarmSummary[]` y la tab "Panel del asesor" del módulo Motor genético (`/motor-genetico/asesor`, solo `ADVISOR`/`ADMIN`) con una tarjeta por tambo.

Corrige de forma aditiva un defecto de `contracts-v1`: `Need.where` y `Need.window` pasan a opcionales para representar un `DRAFT` incompleto, y el esquema de PATCH permite guardar correcciones sin confirmar. La API sigue exigiendo ambos campos para pasar a `OPEN`; no cambian las firmas de los puertos ni las rutas.

## Capabilities

### New Capabilities

- `flow-need`: el recorrido completo de una necesidad genérica (maquinaria, veterinaria) y la derivación al vertical cuando es genética: intake, confirmación, matching, solicitud y valoración, con su pantalla. Incluye el panel del asesor como anexo reasignable.

### Modified Capabilities

Ninguna.

## Impact

- **`packages/ai`:** `src/need-intake.ts` (adaptador real de `NeedIntakePort`). Cambia una línea de `apps/backend/src/ai/ai.providers.ts` (`NEED_INTAKE_PORT`).
- **`apps/backend`:** módulos `needs/`, `providers/`, `matching/`, `requests/` y, para el anexo, `advisor/`. Usan `NeedRepo`, `ProviderRepo`, `ServiceRequestRepo`, `ReviewRepo`, `FarmRepo`, `FemaleRepo`, `ClassificationRepo` de `api-skeleton`. Llaman a `matchNeed` de `@org/matching-core` (el stub hasta I2).
- **`apps/frontend`:** `features/market/` y, para el anexo, `features/advisor/`. Handlers MSW propios de cada feature. Las rutas y la barra de tabs las deja `frontend-shell`; este flujo llena `/mercado` y `/motor-genetico/asesor`.
- **`packages/shared-types`:** `NeedSchema` admite `where`/`window` ausentes en `DRAFT`; `UpdateNeedBodySchema.confirm` es opcional; `PublicProvider` representa la respuesta sin contacto.
- **`apps/backend/prisma`:** las columnas JSON de lugar y ventana admiten `NULL` mientras la necesidad está en `DRAFT`, y `lastMatchBoard` conserva la trazabilidad RN-39.
- **`packages/shared-types/fixtures/providers.json`:** M7 reemplaza la semilla de T0 con el mismo esquema.
- **Sin dependencias nuevas.**

## Dependencias con otras specs

| Depende de | Qué usa | Tipo |
|---|---|---|
| `mvp-0-foundation` (`shared-contracts`, `api-skeleton`, `llm-client`, `frontend-shell`) | Contratos, repos, `UserGuard`, errores, `LlmClient`, shell, cliente tipado, MSW | **Dura**: no arranca sin `contracts-v1` |
| `mvp-a-core` (M2 `matchNeed`, `hardFilters`, `scoreCandidate`) | El matching real | **Blanda**: trabaja contra el stub de T0 hasta **I2** (hora 13) |
| `mvp-c-herd` (B2/B3 clasificaciones) | Solo el anexo del asesor: `FarmSummary` sale de las clasificaciones guardadas | **Blanda**: con el stub de `classifyHerd` hasta I1 |

| Entrega a | Qué |
|---|---|
| `mvp-d-match` | Una `Need` de categoría `GENETICS` confirmada redirige a `/motor-genetico/matching`; el matching genético no depende de este flujo (ADR-0002: arma su propio `Need` sintético) |
| `mvp-a-core` (M3) | `POST /needs/:id/matches` es el camino real por el que `matchNeed` corre en producción con verticales registrados |
