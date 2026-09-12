## Context

Ver `proposal.md` para el porqué. Estado actual del repo (verificado, no el que describe `MASTER-HANDOFF.md §8`):

- `packages/shared-types` es un placeholder: solo exporta `User { id: number; email; name }`.
- `apps/backend` tiene Nx + NestJS + Prisma (Postgres vía `@prisma/adapter-pg`) funcionando, con un `User` placeholder en `schema.prisma`, `UsersController`/`UsersModule` que importan `PrismaService` directo, y `GET /api/users`.
- `apps/frontend` tiene Vite + Tailwind + `react-router-dom` + los 9 componentes de `components/ui` (PR #9) ya implementados; `App.tsx` es la home de prueba del scaffold.
- `fixtures/herd-farm-a.json` (293 animales, verificado: 2 sin `sireNaab`, `029HO19531` con 41 hijas, `visualId` no numéricos como `C136`) vive en la raíz del repo, con forma `{ _meta, farm, females }`. El `farm` embebido no seguirse usando como fuente: `farms.json` (nuevo) lleva la forma real de `Farm` con las zonas grises de ADR-0001.
- `zod@4.6.2` ya está resuelto en el árbol de node_modules pero no es dependencia explícita de ningún paquete propio. `msw`, `@tanstack/react-query`, `@anthropic-ai/sdk`, `xlsx` no están instalados.

Esta es la única spec que las cuatro personas tocan en simultáneo (T0); acá se implementa por una sola persona/agente, así que no hay coordinación en vivo, pero el orden de construcción importa para no romper compilación: `shared-contracts` → (`api-skeleton` y `llm-client` y `frontend-shell` en cualquier orden, todos dependen solo de `shared-contracts`).

## Goals / Non-Goals

**Goals:**
- Dejar los 4 artefactos de las specs (`shared-contracts`, `api-skeleton`, `llm-client`, `frontend-shell`) compilando, testeando y cumpliendo sus criterios de aceptación.
- No romper ningún import existente de `components/ui` (PR #9): se reutilizan tal cual.

**Non-Goals:**
- Lógica real de negocio de los cuatro flujos (`mvp-a-core` a `mvp-d-match`): los núcleos quedan en stub, los endpoints de flujo no se implementan acá.
- Catálogo real de toros/proveedores (A6/M7): se usan las semillas descritas en la spec.
- Tag de git `contracts-v1`: lo crea el equipo al cerrar T0 en la demo real; acá se deja el repo en condiciones de taggearlo (no se ejecuta `git tag` como parte de esta implementación automática).

## Decisions

1. **Orden de implementación:** `shared-contracts` primero y completo (incluye mover `fixtures/herd-farm-a.json`), después `api-skeleton`, `llm-client` y `frontend-shell`. Los tres últimos son independientes entre sí una vez que `shared-contracts` compila.

2. **`GenomicProfile` en Postgres:** columna `Json` (Prisma `Json`) embebida en `Female` y `Bull`, tal como resuelve la Q1 de `api-skeleton` ("el motor no consulta por rasgo, lee el rodeo entero"). Se valida con zod al leer/escribir en el repositorio Prisma, no con constraints de base.

3. **`HerdImport.file`:** columna `Bytes` (`bytea`) en Postgres con TTL de sesión simulado por un campo `createdAt` + limpieza perezosa (se borra al confirmar o al crear uno nuevo para el mismo `farmId`); no hay job de limpieza en background porque la demo dura horas, no días.

4. **`x-user-id` desconocido:** 401 `USER_NOT_FOUND` (Q3 de `api-skeleton`), igual que el header ausente (`USER_HEADER_MISSING`), para que el front trate ambos casos igual ("elegí un usuario").

5. **Fixture `herd-farm-a.json`:** se mueve a `packages/shared-types/fixtures/herd-farm-a.json` conservando `_meta` (documentación, no se valida) y `females` (se valida contra `z.array(FemaleSchema)`); se elimina el `farm` embebido porque no sigue la forma real de `Farm` — `farms.json` (nuevo) es la única fuente de establecimientos.

6. **`llm-client` — salida estructurada:** se usa `tools` con `strict: true` sobre el `@anthropic-ai/sdk` (variante Q1 de `llm-client`, tool con `strict: true`, porque es la forma estable y documentada del SDK para forzar JSON Schema; `output_config.format` no está expuesto de forma estable en la versión del SDK que se instala). El JSON Schema se deriva de cada esquema zod con una conversión mínima escrita a mano para los pocos esquemas que viajan al LLM (evita traer una librería extra de zod-to-json-schema para 3-4 esquemas simples).

7. **Memoización de `llm-client`:** `Map` en memoria dentro del proceso, keyed por hash (`JSON.stringify`) de `{ model, system, user, schemaName }`. Se limpia sola al reiniciar el proceso (REQ-LC-02).

8. **Frontend — routing y estado:** `react-router-dom` (ya instalado) para las rutas de la tabla *Mapa de navegación*; `@tanstack/react-query` para todo fetch; `msw` (service worker en browser) para los mocks, con un archivo de handlers por feature bajo `apps/frontend/src/mocks/handlers/*.ts`, agregados en `apps/frontend/src/mocks/browser.ts`, arrancado condicionalmente en `main.tsx` si `import.meta.env.VITE_MOCKS === 'true'`.

9. **Usuario simulado:** un `UserContext` de React que lee/escribe `localStorage['agromatch:userId']`, expone `{ user, setUserId }`, y un `queryClient.invalidateQueries()` al cambiar. `shared/api` lee el id activo de un getter sincrónico (no de React) para poder usarlo fuera de componentes.

10. **`packages/ai` (llm-client) vs módulo `ai` de `apps/backend`:** son cosas distintas y ambas necesarias. `packages/ai` es la librería Nx TS pura con `AnthropicLlmClient`. `apps/backend/src/ai/` es el módulo Nest que resuelve los tokens de inyección (`LLM_CLIENT`, `EXPLAINER_PORT`, etc.) a fakes de `@org/shared-types/testing` o (cuando exista) al adaptador real, según `AI_MODE`. `apps/backend` importa `packages/ai` solo para el token `LLM_CLIENT` en modo `live`.

## Risks / Trade-offs

- [Riesgo] Convertir zod → JSON Schema a mano para el LLM puede quedar corto si un esquema crece. → Mitigación: los esquemas que via al LLM se mantienen deliberadamente simples (ya lo pide la spec de `llm-client`); si un flujo futuro necesita algo más complejo, se resuelve en su propia spec.
- [Riesgo] Sin `ANTHROPIC_API_KEY` en este entorno de implementación, `REQ-LC-01/02/03/04` (que dependen de interceptar el request real) se verifican con el SDK mockeado en el test, no contra la red; el criterio de aceptación manual "en vivo con clave real" queda pendiente de un humano con la clave.
- [Riesgo] `msw` intercepta en el browser (service worker), lo que requiere `npx msw init public/` para generar `mockServiceWorker.js`. → Se ejecuta como parte de la instalación.
- [Trade-off] El seed inserta en lotes (`createMany`) para performance; no valida uno por uno contra zod en el camino caliente, solo los fixtures se validan una vez en el test de `shared-types` (REQ-SC-05) — evita duplicar validación en cada `db:seed`.
