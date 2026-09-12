# AgroMatch — contexto para el agente

> Si estás leyendo esto, sos el agente de un dev del equipo. **Leé este archivo entero antes de escribir código.** Después leé la tarea que te toca en Notion y `docs/plan-de-trabajo.md`. Nada más: no hace falta que leas toda la documentación.

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
4. **Los contratos se congelan al cerrar T0.** Después, solo cambios aditivos: agregar un campo opcional, un tipo o un endpoint. **Renombrar o borrar frena a los 4 devs**: se avisa y se acuerda.
5. **Honestidad en la UI.** La compatibilidad es un **ranking relativo** ("#1 de 12"), nunca una probabilidad. Un proveedor no verificado se muestra como tal.
6. **La demo funciona sin internet.** Las respuestas del LLM del recorrido de la demo van en caché.

## Stack

TypeScript de punta a punta, monorepo con pnpm workspaces.

```
apps/api            NestJS
apps/web            React + Vite
packages/contracts  tipos, puertos, rutas, fixtures, fakes
packages/matching-core  núcleo, TS puro
packages/genetics-core  vertical genético, TS puro
packages/ai         adaptadores del LLM
```

**Principio de dependencias:** todo apunta a los núcleos. `matching-core` y `genetics-core` **no conocen** NestJS, ni la base de datos, ni el LLM. Un vertical no toca el núcleo: se registra con `registerVertical`.

**Persistencia del MVP:** repositorios en memoria con datos semilla. No hay base de datos. **Usuarios:** simulados con el header `x-user-id`. No hay login.

### LLM: Claude Haiku 4.5

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
| Ramas | `feat/<ID>-<nombre>`, por ejemplo `feat/B2-classification`. Una tarea = un PR chico. |
| Commits | Conventional commits, en español. |
| Tests | Vitest. **Los criterios de aceptación de la tarea son los primeros tests que escribís.** |
| Bloqueos | Nunca esperes a otro dev: usá el sustituto (stub, fake o MSW). Si estás trabado más de 20 minutos, avisá y marcá la tarea como bloqueada. |

**Cómo se logra que 4 devs no se pisen:** después de T0, cada uno trabaja contra **sustitutos** — stubs con la firma final en los núcleos, fakes de la IA en `packages/contracts/testing` y MSW en el front. Las dependencias reales se resuelven en dos integraciones: **I1** (hora 9) e **I2** (hora 13).

## Datos

- `fixtures/herd-farm-a.json`: **rodeo real de un tambo argentino, anonimizado**, 293 animales. Es la fixture de todos los tests del vertical y de la demo. En T0 se mueve a `packages/contracts/fixtures/`.
- Detalles que rompen implementaciones ingenuas:
  - `visualId` es **texto**: hay caravanas como `C136`.
  - 2 animales **sin padre**: no se puede controlar consanguinidad, se etiquetan.
  - El Excel original del productor **no está en el repo** y tiene filas de notas mezcladas con los datos.
- Los proveedores y toros del catálogo son **semilla** hasta que lleguen M7 y A6.

## Estado

**Todavía no hay código.** Lo primero es **T0**: los 4 juntos, hora 0 a 2, armando el monorepo, los contratos y los fixtures. Nadie escribe lógica antes de cerrar T0.

## Documentación

| Archivo | Cuándo leerlo |
|---|---|
| `docs/plan-de-trabajo.md` | **Siempre.** Contratos de T0, tareas con criterios de aceptación, dependencias e hitos |
| `docs/modelo-de-dominio.md` | Antes de tocar reglas: lenguaje ubicuo, entidades, reglas RN-xx, flujos |
| `docs/conceptos-dominio-y-negocio.md` | Si trabajás en el vertical genético y no conocés el mundo del tambo |
| `docs/validacion-mercado.md` | Para el pitch: competencia, mercado y evidencia |
| `docs/analisis-idea-04-matching-reproductivo.md` | Por qué las reglas del documento original estaban mal y cómo se corrigieron |
| `docs/fuentes-datos-toros.md` | De dónde salen los datos de toros y por qué la escala manda |
| `docs/contexto-hackathon.md` | Criterios con los que evaluamos la idea |

## Decisiones abiertas

| # | Decisión |
|---|---|
| **D7** | **Nombre del producto.** El repo dice `agromatch`; "Torinder" es el vertical genético |
| D1 | Qué es exactamente el índice **CI** del genotipado |
| D2 | Validar el algoritmo de clasificación con el analista y el tambero |
| D3 | Umbral de facilidad de parto en vaquillonas (hoy 2,5%) |
| D8 | Qué 3 categorías de proveedores llevan datos semilla |

## Anti-patrones (nos los marcamos entre nosotros)

- Pedirle al LLM que calcule un score, un porcentaje o un valor genético.
- Importar `genetics-core` desde `matching-core`.
- Mostrar la compatibilidad como "probabilidad de éxito".
- Inventar datos de proveedores o de toros y presentarlos como reales.
- Cambiar un contrato sin avisar.
- Dejar la demo dependiendo del wifi.
