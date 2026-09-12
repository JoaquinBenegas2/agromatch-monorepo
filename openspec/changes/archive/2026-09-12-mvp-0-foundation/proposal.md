# mvp-0-foundation — La semilla: contratos, esqueleto, cliente del LLM y shell

> **Es la primera spec que se implementa y bloquea a las otras cuatro.** Nadie escribe lógica de flujo hasta que esto cierra y se etiqueta `contracts-v1`.
>
> Fuente: `MASTER-HANDOFF.md` §6 y §9 (SPEC-SHARED), `docs/plan-de-trabajo.md` §3 (T0), `docs/convenciones-tecnicas.md`, ADR-0001 y ADR-0002.

## Why

Cuatro devs van a trabajar ~20 horas en paralelo **sin depender del código de otro, solo de los contratos**. Eso exige que exista, antes que nada, una base compartida: los tipos y esquemas que viajan entre paquetes, el esqueleto de la API con aislamiento por establecimiento, los stubs y fakes que reemplazan a cada pieza real hasta los hitos de integración, el cliente del LLM y el shell del frontend. Hoy el repo tiene el scaffold de Nx (PR #1) y la librería de componentes (PR #9), pero **cero contratos, cero núcleos, un `User` placeholder en Prisma y una home de prueba**. Sin esta semilla, los flujos no arrancan.

## What Changes

Se divide en **cuatro capacidades con dueño distinto**, para que la semilla, C y D las hagan en paralelo desde el minuto 0:

| Capacidad | Dueño | Qué entrega |
|---|---|---|
| `shared-contracts` | **La semilla** (una sola persona, ~40 min, los otros tres revisan en vivo) | `packages/shared-types` completo (domain, marketplace, ports, api, zod, fixtures, fakes), los paquetes `matching-core`, `genetics-core` y `ai` generados con Nx, y los **stubs** de los núcleos con la firma final |
| `api-skeleton` | **La semilla** | Esquema Prisma que refleja los contratos, interfaces de repositorio, seed re-ejecutable, `UserGuard` con `x-user-id`, filtro global de errores, inyección de los puertos de IA por `AI_MODE`, `GET /me` y `GET /bulls` |
| `llm-client` | **Dev C** (C1, lo publica apenas está) | `LlmClient` sobre `@anthropic-ai/sdk` con Claude Haiku 4.5: salidas estructuradas validadas con zod, caché de prompts, memoización por sesión, `AI_MODE=fake|live` |
| `frontend-shell` | **Dev D** (D1, primeras 2 horas) | Shell + router con las pantallas del MVP, selector de usuario que setea `x-user-id`, cliente de la API tipado con los esquemas de `shared-types` sobre React Query, MSW con los fixtures activado por `VITE_MOCKS=true` |

**Los 9 componentes compartidos de D1 ya están hechos** (`apps/frontend/src/components/ui`, PR #9). Esta spec los declara como precondición cumplida y no los vuelve a especificar.

Cambios sobre el scaffold actual:

- **BREAKING** (solo para el scaffold, nadie depende de esto): el `User { id: number; email; name }` placeholder de `shared-types` y de Prisma se reemplaza por el `User` del contrato (`id: string`, `role`, `farmIds`). `UsersController` (que importa Prisma directo, contra la convención) y el endpoint `GET /api/users` se eliminan. La home del scaffold en `App.tsx` se reemplaza por el shell.
- Los contratos se escriben **como los dejó ADR-0002**: `MatchCandidate` / `MatchBoard` (no existen `MatchResult` ni `MatchSet`), cada `Bull` es una `Capability` de categoría `GENETICS`, `scoreOneCandidate` + `scoreCandidates`.
- Se agregan los **aditivos** que el plan de trabajo no tenía: `Farm.scsGrayZone` y `Farm.plGrayZone` (ADR-0001), `Need.radiusKm` y `Need.createdAt`, `Review.createdAt` (modelo de dominio §5).

## Capabilities

### New Capabilities

- `shared-contracts`: los tipos, esquemas zod, rutas, fixtures, fakes y stubs que todos los paquetes importan como `@org/shared-types`, `@org/matching-core`, `@org/genetics-core` y `@org/ai`. Se congelan con el tag `contracts-v1`; después solo cambios aditivos.
- `api-skeleton`: el esqueleto de NestJS sobre el que cada flujo agrega su módulo: persistencia detrás de repositorios, seed, aislamiento por establecimiento, formato único de error, puertos de IA inyectados y los dos endpoints de humo.
- `llm-client`: el único punto de contacto con Claude. Todo adaptador de IA (intake, mapeo, explicación, objetivo, chat) se construye sobre él.
- `frontend-shell`: la estructura del frontend sobre la que cada flujo agrega su carpeta en `features/`: navegación, usuario simulado, cliente tipado y mocks de red.

### Modified Capabilities

Ninguna: el proyecto no tiene specs previas.

## Impact

- **Paquetes nuevos:** `packages/matching-core`, `packages/genetics-core`, `packages/ai` (generados con `npx nx g @nx/js:lib`).
- **`packages/shared-types`:** deja de ser un placeholder. Suma dependencias `zod`; expone `src/{domain,marketplace,ports,api,schemas}.ts`, `fixtures/`, `testing/`.
- **`apps/backend`:** `prisma/schema.prisma` se reescribe; se agregan `repos/`, `auth/`, `common/errors`, `ai/` (proveedores de puertos), un seed y los scripts `db:seed` / `db:reset`.
- **`apps/frontend`:** `App.tsx` pasa a montar el shell; se crean `shared/api`, `shared/user`, `mocks/` (MSW) y el router. Suma dependencias `@tanstack/react-query`, `msw`.
- **Dependencias externas:** `@anthropic-ai/sdk`, `zod`, `@tanstack/react-query`, `msw`, `xlsx` (SheetJS, lo usa C2 pero se instala acá para que la semilla lo deje listo).
- **Variables de entorno:** `ANTHROPIC_API_KEY`, `AI_MODE`, `DATABASE_URL` en `.env` (raíz) con su `.env.example`. **Ninguna clave entra al repo.**
- **Downstream:** las cuatro specs de flujo (`mvp-a-core`, `mvp-b-need`, `mvp-c-herd`, `mvp-d-match`) dependen de esta. Ninguna de ellas puede renombrar ni borrar algo de acá: si lo necesita, se para, se avisa a los cuatro y se acuerda.

## Contradicciones detectadas

Documentos que quedaron viejos frente a uno de mayor autoridad (orden: ADR > handoff > modelo de dominio > convenciones > plan de trabajo > código real). Esta spec sigue al que gana; el que pierde hay que corregirlo después.

| # | Dónde está la contradicción | Qué gana | Qué hay que corregir |
|---|---|---|---|
| 1 | `plan-de-trabajo.md` T0.4: `POST /farms/:farmId/females/:femaleId/matches` devuelve `MatchSet` | **ADR-0002**: `MatchResult`/`MatchSet` no existen; devuelve `MatchBoard` | La tabla T0.4 del plan |
| 2 | `plan-de-trabajo.md` B1 ("repositorios en memoria") y §8 ("persistencia en memoria con datos semilla") | **Handoff D9 / convenciones §9**: PostgreSQL + Prisma detrás de interfaces de repositorio, con seed re-ejecutable | B1 y la fila de §8 del plan |
| 3 | `convenciones-tecnicas.md` §4 y §7: la UI compartida vive en `apps/frontend/src/shared/ui` | **El código real** (PR #9) y `pantallas.md`: vive en `apps/frontend/src/components/ui`, importada como `@/components/ui/<archivo>` | Convenciones §4 y §7 |
| 4 | `plan-de-trabajo.md` T0.2: `Farm` no tiene los parámetros de zona gris | **ADR-0001** exige `scsGrayZone` y `plGrayZone` configurables por establecimiento | T0.2 del plan (se agrega como aditivo acá) |
| 5 | `plan-de-trabajo.md` T0.5b: `Need` sin `radiusKm` ni `createdAt`; `Review` sin `createdAt` | **Modelo de dominio §5** los lista como atributos clave | T0.5b del plan (se agregan como aditivos acá) |
| 6 | `plan-de-trabajo.md` M5/M6/D1–D7 usan las rutas `apps/api` y `apps/web` | **Handoff §3 y el repo**: `apps/backend` y `apps/frontend` | Rutas de archivos en las tareas del plan |
| 7 | `MASTER-HANDOFF.md` §8: "Código: cero" | **El repo**: la librería de componentes de D1 ya está (PR #9), el scaffold tiene Postgres configurado | Handoff §8 |
| 8 | `MASTER-HANDOFF.md` §6: B5 (endpoints del plan) es de Dev B | **Decisión del equipo (esta ronda de specs)**: pasa a Dev D, porque "swipe → explicación → plan" no puede cruzar dos devs | Handoff §6 y el reparto en Notion |
| 9 | `MASTER-HANDOFF.md` §9 lista cinco specs y no ubica el chat (C6+B7+D8) ni el panel del asesor (B6+D6) | **Decisión del equipo**: van como "Anexo reasignable" dentro de `mvp-a-core` y `mvp-b-need` respectivamente | Handoff §9 |
| 10 | `plan-de-trabajo.md` T0.1 dice "NestJS + Prisma (SQLite)" y `baseline.md` §7 también | **Handoff D9 y `schema.prisma` real**: PostgreSQL | T0.1 del plan y baseline §7 |
| 11 | `pantallas.md` §1: sidebar con grupos Necesidad / Rodeo / Asesor, una pantalla por ítem | **Decisión del equipo (PR #11, `designs/01-sidebar-scaffolding.html`)**: sidebar de 5 módulos estrictos, pantallas del MVP anidadas como tabs. Ver `frontend-shell` | `pantallas.md` §1 |
| 12 | `pantallas.md` §3.4: Swipe con tarjeta tipo Tinder, like/pass con teclado | **`AgroMatch Motor Genetico.dc.html`**: variante sin swipe — contexto fijo arriba, lista con badge de match expandible, excluidos inline. Ver `mvp-d-match` | `pantallas.md` §3.4 |
| 13 | `AgroMatch Motor Genetico.dc.html` muestra "95% match" como badge suelto, un escenario de carne (80 vaquillonas Angus, DEP PN, IATF) y "Iniciar trato" | **RN-15/RN-33 y regla visual 1** (ranking "#n de N", nunca un % suelto), **`baseline.md §1b`** (Torinder es tambo, por hembra) y **N8** (sin negociación). Las specs copian el layout y cambian esos tres textos | El mockup, en la próxima iteración de diseño |
| 14 | `AgroMatch Home Conversacional.dc.html` sugiere chips "semilla de maíz" y "flete" y un micrófono | **N3** (insumos afuera), **N8** (logística afuera), modelo de dominio §11 (audio es hoja de ruta). Los chips del MVP son arada / veterinario / sólidos; el micrófono es visual, deshabilitado | El mockup |
