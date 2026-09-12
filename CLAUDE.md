# Git workflow

## Branching (Git Flow)

- `main` — always deployable/production. Only receives merges from `release/*` and `hotfix/*`. Every merge into `main` is tagged with a version (e.g. `v1.2.0`).
- `develop` — integration branch. All finished features merge here first.
- `feature/<name>` — branches off `develop`, merges back into `develop` via PR (e.g. `feature/scaffold-monorepo`).
- `release/<version>` — branches off `develop` when preparing a release (version bump, last fixes). Merges into both `main` and `develop`.
- `hotfix/<name>` — branches off `main` for urgent production fixes. Merges into both `main` and `develop`.

## Commit messages (Conventional Commits)

Format: `<type>(<scope opcional>): <descripción corta>`

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`, `build`.

Example: `feat(backend): add users module` or `fix(frontend): correct proxy config for /api`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

---

# AgroMatch — contexto del producto

> Si sos el agente de un dev: **leé esto entero antes de escribir código.** Después, la tarea que te toca en Notion y `docs/plan-de-trabajo.md`. Nada más.

## Qué construimos

**Conectamos y resolvemos las necesidades del agro.** El productor escribe lo que necesita en lenguaje natural ("necesito quien me are 40 ha en Río Cuarto la semana que viene", "necesito veterinario para el rodeo", "quiero mejorar los sólidos de mi tambo"); un motor determinístico calcula quién se lo resuelve mejor y la IA explica por qué.

| Capa | Qué hace | Dónde vive |
|---|---|---|
| **Núcleo** | Necesidad × capacidad: filtros duros (cobertura, disponibilidad, capacidad, certificaciones) → score → ranking → explicación | `packages/matching-core` |
| **Vertical genético (Torinder)** | Matching de toros para tambos: clasificación del rodeo, compatibilidad y plan de servicios | `packages/genetics-core` |

Es una hackathon: **~20 horas, 4 devs**, track AGRO.

## Las 6 reglas que no se negocian

1. **La IA nunca produce los números del motor.** Recibe un JSON de hechos y solo redacta. Cada número de una explicación tiene que existir en los hechos; si no, se muestra el texto determinístico (RN-17, RN-18).
2. **Neutralidad.** El ranking no se compra, y la central o el proveedor no influyen en el score. Hay un test que lo verifica (RN-34).
3. **Escala única CDCB** en todo valor genético. Lo que no la declara, no entra al motor (RN-01).
4. **Los contratos se congelan al cerrar T0.** Después, solo cambios aditivos. **Renombrar o borrar frena a los 4 devs**: se avisa y se acuerda.
5. **Honestidad en la UI.** La compatibilidad es un **ranking relativo** ("#1 de 12"), nunca una probabilidad. Un proveedor no verificado se muestra como tal.
6. **La demo corre 100% real.** Claude en vivo, nada pregrabado. Lo que se muestra es lo que el producto hace.

## Dónde va cada cosa (estructura real, Nx)

| Proyecto | Qué es |
|---|---|
| `apps/backend` | NestJS, prefijo `/api`, puerto 3333 |
| `apps/frontend` | React + Vite + Tailwind, puerto 4200 |
| `packages/shared-types` | **Los contratos**: dominio, marketplace, puertos, rutas, fixtures y fakes. Se importa como `@org/shared-types` |
| `packages/matching-core` | Núcleo de matcheo, TS puro (se genera con Nx) |
| `packages/genetics-core` | Vertical genético, TS puro (se genera con Nx) |
| `packages/ai` | Adaptadores del LLM (se genera con Nx) |

**Principio de dependencias:** todo apunta a los núcleos. `matching-core` y `genetics-core` **no conocen** Nest, ni la base de datos, ni el LLM. Un vertical no toca el núcleo: se registra con `registerVertical`.

**Persistencia del MVP (D9, a confirmar en T0):** repositorios **detrás de interfaces**, en memoria, cargados desde los fixtures. Prisma y SQLite ya están cableados en el repo, pero el MVP no los usa: la demo tiene que arrancar siempre en el mismo estado. **Usuarios:** simulados con el header `x-user-id`, sin login.

## LLM: Claude Haiku 4.5

- ID exacto: `claude-haiku-4-5`, con `@anthropic-ai/sdk`, siempre detrás del puerto `LlmClient`.
- Para JSON: **salidas estructuradas** (`output_config.format`) o herramientas con `strict: true`. Nunca "devolveme un JSON" y parsear a mano.
- **Caché de prompts** (`cache_control`) en la parte fija del prompt.
- ⚠️ Haiku 4.5 **no acepta** `thinking: {type: 'adaptive'}` ni `output_config.effort`: eso es de Opus y Sonnet, y devuelve 400. Si hace falta razonamiento: `thinking: {type: 'enabled', budget_tokens: N}`, con `budget_tokens` menor que `max_tokens` y mínimo 1024.
- La clave va por `ANTHROPIC_API_KEY`. **Nunca en el repo.**

## Cómo trabajamos

| Tema | Regla |
|---|---|
| Tareas | Cada una tiene un ID: `T0`, `M2`–`M7`, `A1`–`A6`, `B1`–`B7`, `C1`–`C6`, `D1`–`D7`. Viven en la base **Tareas Torinder** de Notion. |
| Notion | **Obligatorio** usar la skill `torinder-notion-sync` (está en `.claude/skills/`): estado al arrancar, al bloquearse y al terminar, y publicar el contrato si alguien depende de vos. |
| Ramas | `feature/<ID>-<nombre>` desde `develop`, por ejemplo `feature/B2-classification`. Una tarea = un PR chico. |
| Comandos | Todo por Nx: `npx nx run-many -t test`, `npx nx g @nx/js:lib packages/matching-core`. `npm run dev` levanta front y back. |
| Tests | **Los criterios de aceptación de la tarea son los primeros tests que escribís.** |
| Bloqueos | Nunca esperes a otro dev: usá el sustituto (stub, fake o MSW). Si estás trabado más de 20 minutos, avisá y marcá la tarea como bloqueada. |

**Cómo se logra que 4 devs no se pisen:** después de T0, cada uno trabaja contra **sustitutos** — stubs con la firma final en los núcleos, fakes de la IA en `shared-types` y MSW en el front. Las dependencias reales se resuelven en dos integraciones: **I1** (hora 9) e **I2** (hora 13).

## Datos

- `fixtures/herd-farm-a.json`: **rodeo real de un tambo argentino, anonimizado**, 293 animales. Es la fixture de todos los tests del vertical y de la demo. En T0 se mueve junto a los contratos.
- Detalles que rompen implementaciones ingenuas:
  - `visualId` es **texto**: hay caravanas como `C136`.
  - 2 animales **sin padre**: no se puede controlar consanguinidad, se etiquetan.
  - El Excel original del productor **no está en el repo** y tiene filas de notas mezcladas con los datos.
- Los proveedores y toros del catálogo son **semilla** hasta que lleguen M7 y A6.

## Documentación

| Archivo | Cuándo leerlo |
|---|---|
| `docs/plan-de-trabajo.md` | **Siempre.** Contratos de T0, tareas con criterios de aceptación, dependencias e hitos |
| `docs/modelo-de-dominio.md` | Antes de tocar reglas: lenguaje ubicuo, entidades, reglas RN-xx, flujos |
| `docs/motor-datos-de-toros.md` | Si trabajás en el vertical: qué datos del toro entran al match y de dónde salen |
| `docs/definiciones-de-negocio.md` | Qué vendemos, a quién le cobramos y qué NO hacemos |
| `docs/conceptos-dominio-y-negocio.md` | Si no conocés el mundo del tambo |
| `docs/validacion-mercado.md` | Competencia, mercado y evidencia |
| `docs/analisis-idea-04-matching-reproductivo.md` | Por qué las reglas del documento original estaban mal |
| `docs/fuentes-datos-toros.md` | Fuentes de datos de toros y licencias |

## Anti-patrones (nos los marcamos entre nosotros)

- Pedirle al LLM que calcule un score, un porcentaje o un valor genético.
- Importar `genetics-core` desde `matching-core`.
- Mostrar la compatibilidad como "probabilidad de éxito".
- Inventar datos de proveedores o de toros y presentarlos como reales.
- Cambiar un contrato sin avisar.
- Dejar la demo dependiendo del wifi.
