# flow-match — Matching genético → explicación → plan

**Dueño:** Dev D. ~12,5 h en total.
**Prioridad:** P0 (C4, B4, D4) · P1 (B5, D5, C5).
**Tareas del plan:** C4, B4, D4, B5, D5, C5. **B5 pasa de B a D** para que el flujo no cruce dos devs.
**Hito:** I2 (hora 13): matching con `scoreCandidates` real + explicación del LLM + plan.
**Fuente visual (manda sobre `pantallas.md §3.4`):** `AgroMatch Motor Genetico.dc.html` (PR #11, "variante sin swipe") y el *Mapa de navegación* de `mvp-0-foundation/specs/frontend-shell`.

## Purpose

Permite que el productor abra una hembra clasificada, diga qué quiere mejorar y vea los toros de todas las centrales ordenados por lo que le conviene a esa vaca, con la cría esperada contra la madre, por qué algunos quedaron afuera y una explicación de la IA que nunca inventa un número; lo que elige se va armando en un plan de servicios que exporta y le pasa al inseminador.

## Alcance

**Entra**
- `ExplainerPort` real con control de alucinación (C4).
- `POST /farms/:farmId/females/:femaleId/matches` y `POST .../matches/:naab/explanation` (B4), enchufados al núcleo según ADR-0002.
- Pantalla **Matching genético** (D4): tab del módulo "Motor genético", ruta `/motor-genetico/matching/:femaleId?`, carpeta `features/matching/`. Variante **sin swipe**: barra de objetivo, ficha fija de la hembra, lista de toros con badge de match expandible, excluidos inline.
- `buildAutoPlan` real + endpoints `plan/*` + export CSV (B5).
- Pantalla **Plan de servicios** (D5): tab del módulo "Negociación y tratos", ruta `/negociacion/plan`, carpeta `features/plan/`.
- `GoalParserPort` real + `POST /goals/parse` (C5). P1: si aprieta, el objetivo queda solo con presets.

**Queda afuera**
- El score genético en sí (`scoreOneCandidate`, `toExplanationFacts`, `GOAL_PRESETS`): `mvp-a-core` A4/A5. D trabaja contra los stubs de T0 hasta I2.
- El motor genérico (`matchNeed`, `hardFilters`, `registerVertical`): `mvp-a-core` M2/M3. Acá solo se **consume**.
- La clasificación del rodeo y las tabs "Tablero del rodeo" / "Carga del rodeo": `mvp-c-herd`. Acá se exige que la clasificación exista (409 si no). El botón "Subir Excel" de la barra solo navega a `/motor-genetico/importar`.
- La pantalla "Home marketplace general": `mvp-b-need`. Acá se recibe su redirección a `/motor-genetico/matching`.
- El chat (panel lateral del módulo): anexo de `mvp-a-core`. La tab "Panel del asesor": anexo de `mvp-b-need`.
- La tab "Mis matches / mensajes" del módulo "Negociación y tratos": placeholder del shell, no se implementa (N8).
- La barra de tabs de cada módulo: la renderiza `frontend-shell`; D solo aporta el contenido de sus dos tabs.
- Swipe tipo Tinder (tarjeta única, like/pasar con teclado): reemplazado por la lista con badge expandible del mockup.
- Plan con restricciones de presupuesto (D6: hoja de ruta), recordatorios, historial de planes.

## Contratos

### Consume de `shared-contracts`

```ts
export interface ExplanationFacts {
  femaleVisualId: string; femaleCategory: FemaleCategory; tier: Tier; corrective: TraitKey[];
  goal: BreedingGoal;
  bull: { naab: string; name: string; company: string; breed: Breed };
  semenType: SemenType;
  damTraits: TraitVector | null; expectedProgeny: TraitVector | null; deltaVsDam: Partial<TraitVector> | null;
  caseinOdds: CaseinOdds;
  compatibility: number; rank: number; totalCandidates: number;
  reasons: string[];
}
export interface Explanation { text: string; source: 'AI' | 'FALLBACK' }
export interface ExplainerPort { explain(facts: ExplanationFacts): Promise<Explanation> }
export interface GoalParserPort { parse(text: string): Promise<BreedingGoal> }
export interface BreedingGoal {
  preset: GoalPreset | 'CUSTOM';
  weights: Partial<Record<TraitKey, number>>; // suman 1
  wantBetaA2: boolean; wantKappaBB: boolean;
  rawText?: string;
}
export interface MatchCandidate {
  needId: string; capabilityId: string; providerId: string;
  score: number; compatibility: number; rank: number;
  fit: FitBreakdown; filters: FilterResult[];
  verticalFacts?: unknown;      // ExplanationFacts en GENETICS
  reasons: string[]; explanation?: Explanation;
}
export interface MatchBoard { ranked: MatchCandidate[]; excluded: MatchCandidate[] }
export interface PlanItem { femaleId: string; bullNaab: string; semenType: SemenType; compatibility: number; pricePerDose: number | null }
export interface BreedingPlan {
  id: string; farmId: string; createdAt: string; items: PlanItem[];
  totals: { doses: Record<SemenType, number>; cost: number; avgExpectedProgeny: Partial<TraitVector> };
}
export interface LlmClient {
  completeJson<T>(prompt: LlmPrompt, schema: ZodType<T>): Promise<T>;
  completeText(prompt: LlmPrompt): Promise<string>;
}
```

### Consume de `@org/genetics-core` (stubs de T0 hasta I2; lógica real en `mvp-a-core`)

```ts
export function computeTraitStats(profiles: GenomicProfile[]): TraitStats;
export function scoreOneCandidate(female: Female, classification: Classification, bull: Bull, goal: BreedingGoal, stats: TraitStats): { score: number; facts: ExplanationFacts; reasons: string[] };
export function scoreCandidates(female: Female, classification: Classification, bulls: Bull[], goal: BreedingGoal, farm: Farm, stats: TraitStats): MatchBoard; // solo para buildAutoPlan
export const GOAL_PRESETS: Record<GoalPreset, BreedingGoal>;
export const GeneticsVertical: VerticalEngine<ExplanationFacts>;
/** Contexto que B4 pasa a matchNeed como `ctx` (lo define mvp-a-core, ADR-0002). */
export interface GeneticsMatchContext {
  female: Female; classification: Classification; farm: Farm; stats: TraitStats;
  bullsByNaab: Record<string, Bull>;
}
```

### Consume de `@org/matching-core` (stub de T0 hasta I2)

```ts
export function matchNeed(need: Need, caps: Capability[], provs: Provider[], verticals: VerticalEngine[], ctx?: unknown): MatchBoard;
export function registerVertical(engine: VerticalEngine): void;
```

### Produce en `@org/genetics-core` (reemplaza los stubs, misma firma)

```ts
export function makeGeneticsNeed(farmId: string, femaleId: string, goal: BreedingGoal): Need;       // B4
export function buildAutoPlan(
  farm: Farm, females: Female[], classifications: Classification[],
  bulls: Bull[], goal: BreedingGoal, stats: TraitStats,
): BreedingPlan;                                                                                    // B5
```

### Produce en `@org/ai`

```ts
export class AnthropicExplainer implements ExplainerPort {}    // C4
export class AnthropicGoalParser implements GoalParserPort {}  // C5
/** Extrae todos los números del texto (coma o punto decimal) y verifica que cada uno exista en los hechos con tolerancia de redondeo a 1 decimal. */
export function validateNumbers(text: string, facts: ExplanationFacts): { ok: boolean; unknown: number[] };
```

### Rutas (todas con `x-user-id`, `farmId ∈ user.farmIds` o 403)

| Método y ruta | Body | Respuesta | Errores |
|---|---|---|---|
| `POST /farms/:farmId/females/:femaleId/matches` | `{ goal: BreedingGoal }` | `MatchBoard` (ADR-0002) | 404 `FEMALE_NOT_FOUND` · 409 `HERD_NOT_CLASSIFIED` |
| `POST /farms/:farmId/females/:femaleId/matches/:naab/explanation` | `{ goal: BreedingGoal }` | `Explanation` | 404 `BULL_NOT_FOUND` · 409 `HERD_NOT_CLASSIFIED` · 502 `LLM_*` → nunca: cae a `FALLBACK` |
| `POST /farms/:farmId/plan/items` | `PlanItem` | `BreedingPlan` | 404 `FEMALE_NOT_FOUND` / `BULL_NOT_FOUND` |
| `DELETE /farms/:farmId/plan/items/:femaleId` | — | `BreedingPlan` | 404 `PLAN_ITEM_NOT_FOUND` |
| `POST /farms/:farmId/plan/auto` | `{ goal: BreedingGoal }` | `BreedingPlan` | 409 `HERD_NOT_CLASSIFIED` |
| `GET /farms/:farmId/plan` | — | `BreedingPlan` (vacío si no hay ítems) | — |
| `GET /farms/:farmId/plan/export.csv` | — | `text/csv; charset=utf-8` con BOM | — |
| `POST /goals/parse` | `{ text: string }` | `BreedingGoal` | 502 `LLM_*` |

CSV: columnas `visualId, tier, toro, central, tipoSemen, compatibilidad, precio`, separador `,`, una fila por `PlanItem`, ordenado por `visualId`.

### Rutas del frontend (definidas en `frontend-shell`, *Mapa de navegación*)

| Módulo | Tab | Ruta | Carpeta |
|---|---|---|---|
| Motor genético | Matching genético | `/motor-genetico/matching/:femaleId?` | `features/matching/` |
| Negociación y tratos | Plan de servicios | `/negociacion/plan` | `features/plan/` |

Navegan hacia acá: el Tablero del rodeo (`mvp-c-herd`, clic en una hembra → `/motor-genetico/matching/:femaleId`) y la Home del mercado (`mvp-b-need`, necesidad `GENETICS` → `/motor-genetico/matching`). Navega desde acá: "Subir Excel" → `/motor-genetico/importar` (`mvp-c-herd`).

## ADDED Requirements

### Requirement: REQ-D-01 El matching de una hembra pasa por el núcleo con el vertical registrado
`POST /farms/:farmId/females/:femaleId/matches` SHALL construir (o reutilizar) un `Need` sintético con `makeGeneticsNeed(farmId, femaleId, goal)` (`category: 'GENETICS'`), SHALL proyectar los toros cuyo `semenTypes` incluye el `semenType` de la clasificación de la hembra a `Capability` (`id = naab`, `category: 'GENETICS'`, `providerId` = la central como `SEMEN_COMPANY`), SHALL calcular `TraitStats` del tambo y SHALL obtener el `MatchBoard` llamando a `matchNeed(need, caps, provs, [GeneticsVertical], ctx)` de `@org/matching-core`, con `need.goal` igual al `goal` recibido y `ctx` un `GeneticsMatchContext` (`{ female, classification, farm, stats, bullsByNaab }`, definido en `mvp-a-core`). El handler SHALL NOT llamar a `scoreCandidates` ni a `scoreOneCandidate` directamente.

#### Scenario: Recorrido real por el núcleo (criterio de M3)
- **GIVEN** `farm-a` clasificado y la hembra `3031`
- **WHEN** `tambero-a` hace `POST /api/farms/farm-a/females/<id-3031>/matches` con `{ goal: GOAL_PRESETS.SOLIDS_CHEESE }`
- **THEN** responde 200 con un `MatchBoard` cuyos `ranked[i].verticalFacts` validan contra `ExplanationFactsSchema`, `ranked[0].compatibility === 100`, `rank` de 1 a n sin huecos, y un spy sobre `matchNeed` registra exactamente una llamada con `need.category === 'GENETICS'`

#### Scenario: Cada toro es una capacidad
- **WHEN** se inspecciona un `ranked[i]` del `MatchBoard`
- **THEN** `capabilityId` es el `naab` del toro y `providerId` identifica a su central

### Requirement: REQ-D-02 Sin clasificación no hay matching
Si el tambo no tiene una clasificación vigente para la hembra, `POST .../matches`, `POST .../matches/:naab/explanation` y `POST .../plan/auto` SHALL responder 409 `HERD_NOT_CLASSIFIED` con `message: "Clasificá el rodeo antes de buscar toros"`.

#### Scenario: Hembra sin clasificar
- **WHEN** se pide un match de una hembra de un tambo recién importado y nunca clasificado
- **THEN** responde 409 `{ code: 'HERD_NOT_CLASSIFIED', message: 'Clasificá el rodeo antes de buscar toros', details: { farmId, femaleId } }`

### Requirement: REQ-D-03 El Need sintético es invisible para el productor
El `Need` sintético que crea el matching SHALL NOT aparecer en `GET /needs` ni en ninguna lista de necesidades del productor. Repetir el matching con la misma hembra y el mismo objetivo SHALL reutilizar el mismo `Need` sintético en vez de crear uno nuevo.

#### Scenario: Lista de necesidades después de un matching
- **GIVEN** `tambero-a` hizo tres matches de hembras distintas
- **WHEN** pide `GET /api/needs?farmId=farm-a`
- **THEN** ninguna de las necesidades devueltas tiene `category: 'GENETICS'` creada por el swipe

#### Scenario: Mismo par hembra×objetivo dos veces
- **WHEN** se llama dos veces `POST .../matches` con el mismo `goal`
- **THEN** el `needId` de los candidatos es el mismo en las dos respuestas

### Requirement: REQ-D-04 La explicación nunca inventa un número
`ExplainerPort.explain(facts)` SHALL pedir al LLM un texto en español rioplatense de 3 a 4 oraciones, sin jerga, y SHALL validar con `validateNumbers` que **cada número del texto** (con coma o punto decimal) exista en `facts` con tolerancia de redondeo a 1 decimal. Si algún número no existe, o el LLM falla tras el reintento de `llm-client`, SHALL devolver `{ text: facts.reasons.join(' '), source: 'FALLBACK' }`. El LLM SHALL NOT recibir ningún pedido de calcular, estimar ni comparar valores: solo redacta sobre los hechos.

#### Scenario: Número que no está en los hechos
- **GIVEN** unos `facts` donde ningún valor es 2,70 (ni redondea a 2,7)
- **WHEN** el LLM devuelve un texto que dice "SCS 2,70"
- **THEN** `explain` devuelve `source: 'FALLBACK'` y `text === facts.reasons.join(' ')`

#### Scenario: Caso 3031 con Claude en vivo
- **GIVEN** los `facts` de 3031 × el toro #1 con objetivo `SOLIDS_CHEESE` (`fixtures/samples/explanation-facts.json`)
- **WHEN** se llama `explain` con `AI_MODE=live`
- **THEN** devuelve `source: 'AI'`, el texto menciona la mastitis y todos sus números existen en los hechos

#### Scenario: Coma y punto decimal
- **WHEN** el texto dice "de 3,19 a 2.95" y los hechos tienen `damTraits.scs = 3.19` y `expectedProgeny.scs = 2.95`
- **THEN** `validateNumbers` devuelve `ok: true`

#### Scenario: El LLM no responde
- **WHEN** `llm-client` lanza `LlmUnavailableError`
- **THEN** `explain` devuelve `FALLBACK` y el endpoint responde 200, no 502

### Requirement: REQ-D-05 La explicación se cachea por hechos
`POST .../matches/:naab/explanation` SHALL calcular un hash determinístico de `ExplanationFacts` y SHALL reutilizar la `Explanation` ya generada para ese hash sin volver a invocar `ExplainerPort`.

#### Scenario: Dos llamadas iguales
- **WHEN** se hace dos veces la misma llamada de explicación para 3031 × toro #1 con el mismo objetivo
- **THEN** `ExplainerPort.explain` se invoca una sola vez y las dos respuestas son idénticas

#### Scenario: Cambia el objetivo
- **WHEN** se repite la llamada con `goal.preset` distinto
- **THEN** `ExplainerPort.explain` se invoca de nuevo

### Requirement: REQ-D-06 La lista de toros muestra el ranking como ranking, con badge expandible
La tab "Matching genético" (`/motor-genetico/matching/:femaleId`) SHALL mostrar, bajo el título "Toros compatibles — N evaluados contra tu hembra · ordenado por compatibilidad · M excluidos", una fila (`Card`) por candidato de `ranked` con: imagen placeholder, `name`, `company · breed · semenType · US$ pricePerDose/dosis` (o "sin precio" si es `null`), un **badge de match expandible** (chevron) cuyo texto SHALL ser `#k de N · {compatibility}` — **nunca "95% match" ni ningún `%` suelto** (RN-15 / RN-33, regla visual 1 de `pantallas.md §4`): el mockup muestra "95% match" y esta spec no lo copia, porque la compatibilidad es un ranking relativo, no una probabilidad — y la acción secundaria "Ver detalle" que alterna la expansión. El primer candidato SHALL aparecer expandido por defecto. El cuerpo expandido SHALL tener dos columnas: a la izquierda "POR QUÉ MATCHEA · CRÍA ESPERADA" con una `ComparisonBar` por rasgo con peso en el objetivo (madre → cría esperada, `direction="lower-is-better"` en `scs` y `rfi`), la línea de caseínas "A2/A2 {p}% · BB {p}%" (probabilidades del genotipo de la cría, permitidas; "sin dato" si `null`), los `Badge variant="ok"` de los filtros pasados ("parentesco ok", "parto ok") y `AiExplanation` con `source` siempre visible; a la derecha la tabla "MADRE VS TORO" con columnas `Carácter | Madre | Toro | Cría esperada` para los rasgos con peso.

#### Scenario: Fila del #1 expandida
- **GIVEN** un `MatchBoard` con 12 candidatos para 3031 y objetivo `SOLIDS_CHEESE`
- **WHEN** se abre `/motor-genetico/matching/<id-3031>`
- **THEN** la primera fila está expandida, su badge dice "#1 de 12 · 100", muestra `ComparisonBar` para SCS con `direction="lower-is-better"`, la tabla "MADRE VS TORO" tiene la fila SCS con madre 3,19 y cría esperada < 3,00, y `AiExplanation` tiene `source` visible

#### Scenario: Ningún porcentaje suelto
- **WHEN** se inspecciona el texto de todos los badges de match de la lista
- **THEN** cada uno matchea `#\d+ de \d+ · \d+` y ninguno contiene "%" ni "match" ni "probabilidad"

#### Scenario: Caseína sin dato
- **WHEN** `caseinOdds.kappaBB === null`
- **THEN** la fila expandida dice "BB: sin dato", nunca 0%

### Requirement: REQ-D-07 La barra de objetivo: texto libre, presets, "Subir Excel" y "Procesar"
Arriba de la lista, la tab SHALL mostrar la barra del mockup: un campo de texto libre para el objetivo (placeholder `"quiero mejorar los sólidos de mi tambo"`), un `Select` de presets, el botón secundario "Subir Excel" (navega a `/motor-genetico/importar`) y el botón primario "Procesar". "Procesar" SHALL llamar a `POST /goals/parse` con el texto (si el texto está vacío, SHALL usar el preset seleccionado sin llamar al LLM), SHALL mostrar los pesos resultantes para ajustarlos, y SHALL recalcular la lista en la misma ruta.

#### Scenario: Objetivo escrito
- **WHEN** el usuario escribe "quiero más sólidos para la quesera" y presiona "Procesar"
- **THEN** se ve `preset: 'SOLIDS_CHEESE'` con sus pesos editables, y la lista se vuelve a pedir con el nuevo objetivo sin cambiar de ruta

#### Scenario: Procesar con el texto vacío
- **WHEN** el campo está vacío, el preset es `BALANCED` y se presiona "Procesar"
- **THEN** no se llama a `POST /goals/parse` y la lista se pide con `GOAL_PRESETS.BALANCED`

#### Scenario: Subir Excel
- **WHEN** se presiona "Subir Excel"
- **THEN** la app navega a `/motor-genetico/importar` sin perder el objetivo escrito al volver

### Requirement: REQ-D-08 Ficha fija de la hembra y elección para el plan
Entre la barra y la lista, la tab SHALL mostrar la ficha oscura "TU HEMBRA · CONTEXTO FIJO PARA TODO EL LISTADO" con `visualId · categoría · tier` (por ejemplo "3031 · Vaquillona · COMERCIAL"), y las columnas Objetivo (preset o `rawText`), Corrige (`classification.corrective`, por ejemplo "SCS") y Etiquetas (`classification.tags`), más el botón "Cambiar hembra" que abre un selector con búsqueda por `visualId` entre las hembras clasificadas del tambo. Sin `:femaleId` en la ruta, la ficha SHALL ser un `EmptyState` que invita a elegir una hembra, con el selector y un enlace al Tablero del rodeo. La acción primaria de cada fila SHALL ser **"Elegir para el plan"** (no "Iniciar trato": N8, sin negociación en el MVP), que crea o reemplaza el `PlanItem` de la hembra vía `POST /farms/:farmId/plan/items`; una vez elegido, la fila SHALL mostrar `Badge variant="ok"` "En el plan" y la acción SHALL pasar a "Quitar del plan" (`DELETE /farms/:farmId/plan/items/:femaleId`). Cuando `ranked` está vacío, la lista SHALL mostrar un `EmptyState` con el motivo y los excluidos inline debajo.

#### Scenario: Recorrido de la demo con mocks
- **GIVEN** `VITE_MOCKS=true`
- **WHEN** desde el Tablero del rodeo se hace clic en 3031, se escribe "sólidos" y "Procesar", la primera fila expandida muestra SCS mejorando y se presiona "Elegir para el plan"
- **THEN** se hace `POST /farms/farm-a/plan/items` con `{ femaleId, bullNaab, semenType, compatibility, pricePerDose }`, la fila muestra "En el plan", y al ir a `/negociacion/plan` la hembra 3031 aparece con ese toro

#### Scenario: Sin hembra en la ruta
- **WHEN** se navega a `/motor-genetico/matching` sin `femaleId`
- **THEN** la ficha es un `EmptyState` con el selector de hembras y un enlace a `/motor-genetico/tablero`; no se pide ningún `MatchBoard`

#### Scenario: Sin candidatos
- **WHEN** el `MatchBoard` tiene `ranked: []`
- **THEN** se muestra `EmptyState` con el motivo y las filas de `excluded` siguen visibles debajo

### Requirement: REQ-D-09 Los excluidos se muestran inline con su motivo
Al final de la misma lista, la tab SHALL mostrar cada candidato de `excluded` como una fila a opacidad reducida, sin badge de match ni acción, con el subtítulo en color de peligro `Excluido: {detail}` tomado de cada `MatchCandidate.filters` con `passed: false` (los pone `matchNeed` a partir de lo que devuelve el vertical, ver Q6; por ejemplo "Excluido: hijo del mismo padre, 12,5% de consanguinidad" o "Excluido: parto sin dato de facilidad"). El contador "M excluidos" del título SHALL coincidir con `excluded.length`. Ningún excluido SHALL ocultarse en silencio.

#### Scenario: Hijo del mismo padre
- **GIVEN** una hembra hija de `029HO19531`
- **WHEN** se recorre la lista hasta el final
- **THEN** los hijos de `029HO19531` aparecen atenuados con el motivo de RN-05, sin botón "Elegir para el plan", y el contador del título coincide con `excluded.length`

### Requirement: REQ-D-10 Plan automático con el mejor toro para cada hembra
`buildAutoPlan` SHALL producir un `PlanItem` por cada hembra con clasificación cuyo `tier` no sea `CULL_ALERT`, eligiendo el toro `#1` de su `MatchBoard`, sin restricción de presupuesto. `POST /plan/auto` SHALL reemplazar los ítems del plan con ese resultado.

#### Scenario: Plan automático de farm-a
- **GIVEN** `farm-a` clasificado con objetivo `BALANCED` (2 hembras en `CULL_ALERT`)
- **WHEN** se llama `buildAutoPlan` con los 293 animales
- **THEN** devuelve un ítem por cada hembra clasificada que no está en `CULL_ALERT`, ninguna hembra aparece dos veces, y cada ítem usa un `semenType` permitido por su tier

### Requirement: REQ-D-11 Los totales del plan son determinísticos
`BreedingPlan.totals` SHALL calcularse en el servidor: `doses` cuenta ítems por `SemenType`; `cost` suma `pricePerDose` **ignorando los `null`**; `avgExpectedProgeny` promedia la cría esperada de los ítems que tienen perfil.

#### Scenario: Costo con precios faltantes
- **GIVEN** un plan con 3 ítems de precios 38, `null` y 12
- **WHEN** se pide `GET /plan`
- **THEN** `totals.cost === 50` y `totals.doses` suma 3

### Requirement: REQ-D-12 Alta y baja manual de ítems
`POST /plan/items` SHALL agregar o reemplazar el ítem de esa hembra (una hembra, un toro); `DELETE /plan/items/:femaleId` SHALL quitarlo. Ambos SHALL devolver el plan completo con totales recalculados.

#### Scenario: Reemplazar el toro de una hembra
- **WHEN** se hace `POST /plan/items` para 3031 con un toro distinto al que ya tenía
- **THEN** el plan sigue teniendo un solo ítem para 3031, con el toro nuevo

### Requirement: REQ-D-13 Export CSV que abre en Excel
`GET /plan/export.csv` SHALL devolver `text/csv; charset=utf-8` con BOM y las columnas `visualId, tier, toro, central, tipoSemen, compatibilidad, precio`.

#### Scenario: Tildes en Excel
- **WHEN** se descarga el CSV con un toro cuyo nombre lleva tilde y se abre en Excel
- **THEN** la tilde se ve bien y las 7 columnas están en su lugar

### Requirement: REQ-D-14 La tab del plan de servicios
La tab "Plan de servicios" del módulo "Negociación y tratos" (`/negociacion/plan`) SHALL mostrar la tabla de ítems (`visualId`, tier, toro, central, tipo de semen, `#k de N · compatibilidad`, precio), los totales en `StatCard` (dosis por tipo, costo, cría esperada promedio), el botón "Plan automático" (que pide el objetivo vigente) y el botón "Exportar CSV". SHALL tener los cuatro estados obligatorios. La otra tab del módulo ("Mis matches / mensajes") es un placeholder del shell y D SHALL NOT implementarla.

#### Scenario: Plan vacío
- **WHEN** `GET /plan` devuelve `items: []`
- **THEN** se muestra `EmptyState` con la acción "Plan automático" y un enlace a `/motor-genetico/matching`

#### Scenario: Volver a la hembra desde el plan
- **WHEN** se hace clic en la fila de 3031
- **THEN** la app navega a `/motor-genetico/matching/<id-3031>` con el toro elegido marcado "En el plan"

### Requirement: REQ-D-15 El objetivo en lenguaje natural se normaliza, nunca falla
`GoalParserPort.parse(text)` SHALL obtener un `BreedingGoal` estructurado del LLM, SHALL conservar `rawText`, SHALL validar que cada peso esté entre 0 y 1 y SHALL normalizar `weights` para que sumen 1. Pesos que no suman 1 SHALL normalizarse, nunca producir error.

#### Scenario: Leche A2
- **WHEN** se parsea "leche A2 para vender a la industria"
- **THEN** `wantBetaA2 === true` y `rawText` es el texto original

#### Scenario: Pesos desbalanceados
- **WHEN** el LLM devuelve `weights: { pro: 0.5, fat: 0.5, scs: 0.5 }`
- **THEN** se devuelven normalizados (`≈ 0.333` cada uno) y la suma es 1 ± 0.001

## Reglas que respeta

- **RN-13** (el tier define el catálogo: solo los toros con el `semenType` de la clasificación entran como capacidades, REQ-D-01) · **RN-14** (los filtros van antes: `excluded` viene del núcleo, REQ-D-09) · **RN-15 / RN-33** (compatibilidad como ranking, REQ-D-06) · **RN-16** (toros de carne ordenados por parto y precio: lo hace A4, acá se muestra) · **RN-17** (la IA solo redacta, REQ-D-04) · **RN-18** (control de alucinación, REQ-D-04) · **RN-20** (objetivo en lenguaje natural con `rawText`, REQ-D-07, REQ-D-15) · **RN-35 y ADR-0002** (REQ-D-01 es la prueba de integración real que exige el criterio de M3: el matching de la demo pasa por `matchNeed`, no solo el test aislado del vertical) · **RN-38** (`farmId ∈ user.farmIds`, lo hace `api-skeleton`) · **N6 / RN-34** (`company` se muestra, no influye; el ranking viene del motor) · **N8** (sin negociación: "Elegir para el plan", no "Iniciar trato", REQ-D-08) · **D6** (plan automático sin presupuesto, REQ-D-10) · `pantallas.md` §4 reglas 1 (ranking), 3 (excluidos visibles), 4 (indicador AI/FALLBACK), 5 (mensaje real del backend).
- **Fuente visual:** `AgroMatch Motor Genetico.dc.html` (PR #11) manda sobre `pantallas.md §3.4`, que queda superado (la variante con swipe, la pestaña "Excluidos" y los atajos de teclado ya no existen). Del mockup se copian el layout y los estados: barra superior, ficha fija oscura, lista con badge expandible, dos columnas (barras + tabla), excluidos inline atenuados. **No se copian tres cosas, a propósito:** (1) el badge "95% match" → "#k de N · compatibilidad", porque un `%` suelto se lee como probabilidad (RN-15/RN-33, regla visual 1); (2) el escenario de carne (80 vaquillonas Angus, DEP peso al nacer, IATF) → los datos de Torinder (una hembra lechera, SCS/PL/sólidos, A2/BB), porque el vertical del MVP es el tambo (`baseline.md §1b` paso 4); (3) "Iniciar trato" → "Elegir para el plan", porque la negociación está fuera del MVP (N8) y el destino real de una elección es el plan de servicios (F4).

## Criterios de aceptación

**Vitest (núcleos y `packages/ai`):**
- [ ] `validateNumbers("SCS 2,70", facts)` sin 2,7 en los hechos → `ok: false` (REQ-D-04).
- [ ] `validateNumbers("de 3,19 a 2.95", facts)` con esos valores → `ok: true`.
- [ ] `buildAutoPlan(farm-a clasificado)` → un ítem por hembra que no está en `CULL_ALERT`, sin duplicados (REQ-D-10).
- [ ] `totals.cost` ignora `null` (REQ-D-11).
- [ ] `parse` normaliza pesos que no suman 1 (REQ-D-15).

**Verificación manual (API, se describe en el PR, convenciones §1):**
- [ ] `POST /matches` de una hembra sin clasificar → 409 `HERD_NOT_CLASSIFIED` (REQ-D-02).
- [ ] Spy/log sobre `matchNeed`: una llamada por `POST /matches`, con `category: 'GENETICS'` (REQ-D-01).
- [ ] Dos llamadas iguales a `/explanation` → una sola invocación del `ExplainerPort` (log en consola) (REQ-D-05).
- [ ] `GET /needs?farmId=farm-a` después de tres swipes no lista necesidades sintéticas (REQ-D-03).
- [ ] Caso 3031 con `AI_MODE=live`: `source: 'AI'` y menciona la mastitis (REQ-D-04). Captura en el PR.
- [ ] El CSV abre en Excel con tildes correctas (REQ-D-13). Captura en el PR.

**Verificación manual (pantallas, captura en el PR):**
- [ ] Recorrido con mocks: Tablero → clic en 3031 → "sólidos" + "Procesar" → primera fila expandida con SCS mejorando → "Elegir para el plan" → "En el plan" → aparece en `/negociacion/plan` (REQ-D-08).
- [ ] Todos los badges de match matchean `#k de N · compatibilidad`; ninguno dice "%", "match" ni "probabilidad" (REQ-D-06).
- [ ] La primera fila está expandida al cargar; "Ver detalle" colapsa y expande (REQ-D-06).
- [ ] Contraer y volver a expandir una fila **no vuelve a pedir** la explicación: la query `['explanation', farmId, femaleId, naab, goalHash]` se sirve de caché (pestaña Network sin request nuevo).
- [ ] Los hijos de `029HO19531` aparecen al final de la lista, atenuados, con su motivo y sin acción; el contador del título coincide (REQ-D-09).
- [ ] "Procesar" con el texto vacío no llama a `/goals/parse` (REQ-D-07).
- [ ] "Subir Excel" navega a `/motor-genetico/importar` (REQ-D-07).
- [ ] Sin `femaleId` en la ruta: `EmptyState` con selector de hembras (REQ-D-08).
- [ ] La ficha oscura muestra visualId, categoría, tier, objetivo, "Corrige: SCS" y etiquetas de 3031 (REQ-D-08).
- [ ] Los cuatro estados en `/motor-genetico/matching` y `/negociacion/plan`.
- [ ] El sidebar NO tiene ítems "Swipe" ni "Plan": son tabs de "Motor genético" y "Negociación y tratos" (`frontend-shell` REQ-FS-01).

## Riesgos y supuestos

- **Riesgo:** la demo depende de Claude en vivo (convenciones §6). Mitigación: `FALLBACK` es siempre un texto válido (REQ-D-04), así la tarjeta nunca queda vacía; la memoización de `llm-client` y el caché por hechos (REQ-D-05) hacen que el ensayo previo "caliente" las explicaciones del recorrido.
- **Riesgo:** latencia de la explicación por fila (1–3 s con Haiku). Como la lista muestra varias filas, solo se pide la explicación de la fila **expandida** (la primera por defecto); las demás se piden al expandirlas, con prefetch de la siguiente. Queda como pregunta abierta Q4.
- **Riesgo:** el mockup fue dibujado para un lote de carne; si D copia los textos ("DEP destete", "IATF", "Riesgo parto") en vez de los de Torinder, la demo cuenta otro producto. Mitigación: REQ-D-06 y REQ-D-08 fijan los textos con los datos de `ExplanationFacts`.
- **Riesgo:** `bulls.seed.json` sin un toro lechero con SCS ≤ 2,80 y `CONVENTIONAL`: la escena de 3031 no funciona. Depende de la mitigación prevista en la sección *Riesgos* de `mvp-0-foundation/shared-contracts` (la semilla incluye al menos 3 lecheros con `scs ≤ 2.80` y `CONVENTIONAL`; no es un requisito formal, ver `mvp-a-core` Q6).
- **Supuesto:** hasta I2, `matchNeed` y `scoreOneCandidate` son los stubs de T0 (compatibilidad = 100 − 5·posición, sin filtros). La pantalla se construye contra `fixtures/samples/match-board-genetics.json`, que sí trae excluidos.
- **Supuesto:** `Need.synthetic` no está en los contratos; si se persiste el `Need` sintético, hace falta ese flag aditivo (Q1).
- **Supuesto:** el objetivo vigente para "Plan automático" es el último confirmado en el matching de ese tambo (Q2).
- **Supuesto:** `pantallas.md §3.4` y `§3.5` quedaron viejos frente a PR #11; se corrigen en un PR de docs. Esta spec sigue al mockup.

## Preguntas abiertas

| # | Pregunta | Default | Quién cierra |
|---|---|---|---|
| Q1 | ¿El `Need` sintético se persiste en `NeedRepo` (con un flag aditivo `synthetic: true` que `GET /needs` filtra) o no se persiste y se reconstruye por hash de `(farmId, femaleId, goal)`? | **Se persiste con `Need.synthetic: true`; `NeedRepo.listByFarm` lo excluye salvo `includeSynthetic: true` (opción ya prevista en `api-skeleton`).** Misma convención en `mvp-b-need` Q6. ✅ El campo ya está en `contracts-v1` (`mvp-0-foundation` Q5) | Dev D en B4 |
| Q2 | ¿El objetivo (`BreedingGoal`) es por tambo (persistido) o por sesión del front? | Por tambo, guardado junto con la clasificación (`ClassificationRepo` ya guarda el `goal`); la tab de matching puede sobreescribirlo por sesión | Dev D con Dev C |
| Q3 | ¿La primera fila arranca expandida (como el mockup) aunque eso dispare la explicación del LLM al cargar? | Sí: es la escena de la demo; la explicación de la #1 se pide al cargar y se cachea | Dev D en D4 |
| Q4 | ¿Se prefetchea la explicación de la fila siguiente a la expandida? | Sí, con `queryClient.prefetchQuery` al expandir una fila | Dev D en D4 |
| Q7 | ¿"Cambiar hembra" es un `Select` simple o un `Popover` con búsqueda por `visualId`? | `Popover` + `Input` con filtro, listando solo hembras clasificadas (las `CULL_ALERT` marcadas) | Dev D en D4 |
| Q8 | ¿Qué hace "Procesar" cuando el texto está vacío? | Usa el preset del `Select` sin llamar al LLM (REQ-D-07) | Dev D en D4 |
| Q5 | ¿`POST /plan/auto` pisa los ítems elegidos a mano? | Sí, los reemplaza todos (D6: plan simple) | Dev D en B5 |
| Q6 | Los `FilterResult` fallidos del vertical (RN-05, RN-06, RN-13) no tienen lugar tipado en el retorno de `VerticalEngine.score()`, y la pestaña de excluidos los necesita en `MatchCandidate.filters` | `ExplanationFacts.filters?: FilterResult[]`; el vertical lo llena y `matchNeed` lo copia a `MatchCandidate.filters`. Misma convención en `mvp-a-core` Q7. ✅ El campo ya está en `contracts-v1` (`mvp-0-foundation` Q5). Hasta I2, `samples/match-board-genetics.json` ya trae `filters` en los excluidos | Dev A lo implementa; D lo consume |
