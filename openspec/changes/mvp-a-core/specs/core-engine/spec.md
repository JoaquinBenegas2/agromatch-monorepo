# core-engine — Motor de matcheo genérico y vertical genético

**Dueño:** Dev A.
**Prioridad:** P0 (M2, M3, A1–A5) · P1 (A6, anexo del chat).
**Tareas:** M2, M3, A1, A2, A3, A4, A5, A6 + anexo C6, B7 (parte del chat), D8.
**Depende de:** `mvp-0-foundation` (`shared-contracts` congelado en `contracts-v1`).

## Purpose

Implementa el motor determinístico del producto como funciones puras: en `matching-core`, filtros duros, score ponderado, compatibilidad relativa y registro de verticales; en `genetics-core`, cría esperada, caseínas por Mendel, consanguinidad, facilidad de parto, score genético con apareamiento correctivo y los hechos que la IA solo redacta. Ninguna de estas funciones conoce Nest, la base ni el LLM.

## Alcance

**Entra**
- `packages/matching-core`: `hardFilters`, `scoreCandidate`, `matchNeed`, `registerVertical`, `listVerticals` reales (M2).
- `packages/genetics-core`: `deriveCategory`, `computeTraitStats`, `expectedProgeny`, `normalize` (A1); `caseinOdds` (A2); `inbreedingFilter`, `calvingEaseFilter` (A3); `scoreOneCandidate`, `scoreCandidates`, `GOAL_PRESETS` (A4); `toExplanationFacts` y los textos determinísticos de `reasons` (A5); `GeneticsVertical` (M3).
- Tests Vitest de los dos núcleos contra los fixtures, incluido el test de dependencias y el de neutralidad.
- **P1:** A6, catálogo real de toros con el mismo esquema que la semilla.
- **Anexo reasignable (P1):** chat sobre el rodeo, al final de este documento.

**Queda afuera**
- `classifyHerd` y `classifyHerdClassic` (B2): `mvp-c-herd`. Este motor **consume** una `Classification` ya calculada.
- `makeGeneticsNeed` y `buildAutoPlan` (B4, B5): `mvp-d-match`.
- Todo endpoint y toda pantalla, salvo los del anexo.
- Haplotipos y defectos genéticos, abuelo materno, fertilidad del toro (`motor-datos-de-toros.md` §6): hoja de ruta.
- Cualquier conversión de escala que no sea CDCB (ADR-0003).

## Contratos

Todas las firmas son las de `contracts-v1` (`mvp-0-foundation/specs/shared-contracts`). Se transcriben para que el dev no tenga que ir a buscarlas; **no se modifican**.

### `@org/matching-core` — produce

```ts
export function hardFilters(need: Need, cap: Capability, prov: Provider): FilterResult[];                              // M2
export function scoreCandidate(need: Need, cap: Capability, prov: Provider): { score: number; fit: FitBreakdown; reasons: string[] }; // M2
export function matchNeed(need: Need, caps: Capability[], provs: Provider[], verticals: VerticalEngine[], ctx?: unknown): MatchBoard; // M2
export function registerVertical(engine: VerticalEngine): void;                                                        // M2
export function listVerticals(): VerticalEngine[];                                                                    // M2
```

Semántica de `matchNeed` (RN-31 → RN-33 → RN-35, ADR-0002):
1. Para cada `Capability` de la categoría de la necesidad: `hardFilters`. Si alguno no pasa → va a `excluded` con sus `filters`, `score: 0`, `compatibility: 0`, `rank: 0`.
2. Si hay un `VerticalEngine` en `verticals` con `canHandle(need) === true`: por cada candidato que pasó los filtros se llama **una vez** a `engine.score(need, candidate, ctx)`; su `score` **crudo** reemplaza al genérico, `fit.vertical` recibe el score normalizado dentro del conjunto y `verticalFacts` recibe `facts`. Los filtros del vertical (RN-13, RN-05, RN-06) se aplican **dentro** de `score`: un candidato que no pasa devuelve `score: -Infinity` con los `FilterResult` fallidos en `facts.filters` (aditivo propuesto a `ExplanationFacts`, ver Q7) y el núcleo lo pasa a `excluded` copiando esos `FilterResult` a `MatchCandidate.filters` (ver REQ-A-03). Es la misma convención que `mvp-d-match` (B4) espera para la pestaña de excluidos.
3. Si no hay vertical: `scoreCandidate` genérico.
4. Compatibilidad: min-max de 0 a 100 sobre **todos** los `ranked` en un solo paso (un solo candidato → 100). `rank` de 1 a n sin huecos. Orden: `score` desc; empate → `providerId` asc (determinista).

### `@org/genetics-core` — produce

```ts
export function deriveCategory(birthDate: string, today: string): FemaleCategory;                 // A1
export function computeTraitStats(profiles: GenomicProfile[]): TraitStats;                          // A1
export function expectedProgeny(dam: TraitVector, sire: TraitVector): TraitVector;                  // A1
export function normalize(value: number, key: TraitKey, stats: TraitStats): number;                 // A1
export function caseinOdds(dam: GenomicProfile, sire: GenomicProfile): CaseinOdds;                  // A2
export function inbreedingFilter(female: Female, bull: Bull): FilterResult;                         // A3
export function calvingEaseFilter(female: Female, bull: Bull, farm: Farm): FilterResult;            // A3
export function scoreOneCandidate(                                                                  // A4 (ADR-0002)
  female: Female, classification: Classification, bull: Bull,
  goal: BreedingGoal, stats: TraitStats,
): { score: number; facts: ExplanationFacts; reasons: string[] };
export function scoreCandidates(                                                                    // A4, sobre scoreOneCandidate
  female: Female, classification: Classification, bulls: Bull[],
  goal: BreedingGoal, farm: Farm, stats: TraitStats,
): MatchBoard;
export function toExplanationFacts(input: ToExplanationFactsInput): ExplanationFacts;               // A5
export const GOAL_PRESETS: Record<GoalPreset, BreedingGoal>;                                        // A4
export const GeneticsVertical: VerticalEngine<ExplanationFacts>;                                    // M3

/** Aditivo (no estaba tipado en T0.5; ver Preguntas abiertas Q1). */
export interface ToExplanationFactsInput {
  female: Female; classification: Classification; bull: Bull; goal: BreedingGoal;
  semenType: SemenType; expectedProgeny: TraitVector | null; caseinOdds: CaseinOdds;
  score: number; compatibility: number; rank: number; totalCandidates: number; reasons: string[];
}
/** Contexto que B4 (mvp-d-match) pasa a matchNeed para que GeneticsVertical.score trabaje (ADR-0002). */
export interface GeneticsMatchContext {
  female: Female; classification: Classification; farm: Farm; stats: TraitStats;
  bullsByNaab: Record<string, Bull>;
}
```

`GOAL_PRESETS` (pesos que suman 1; A4 los fija, D4 y C5 los muestran):

| Preset | `weights` | `wantBetaA2` | `wantKappaBB` |
|---|---|---|---|
| `BALANCED` | `ci: 1` | false | false |
| `SOLIDS_CHEESE` | `fat: 0.3, pro: 0.4, scs: 0.15, pl: 0.15` | false | true |
| `A2_MILK` | `milk: 0.3, pro: 0.2, pl: 0.25, scs: 0.25` | true | false |
| `VOLUME` | `milk: 0.6, fat: 0.15, pro: 0.15, pl: 0.1` | false | false |
| `HEALTH_LONGEVITY` | `pl: 0.45, scs: 0.4, fs: 0.15` | false | false |
| `EFFICIENCY` | `rfi: 0.4, fs: 0.3, pro: 0.15, fat: 0.15` | false | false |

Los valores concretos son una **decisión por defecto de A** (ver Q2); lo que no se negocia es que suman 1 y que `SOLIDS_CHEESE` pesa proteína y grasa y `A2_MILK` pide A2.

### Consume

De `@org/shared-types`: `Female`, `Bull`, `Farm`, `BreedingGoal`, `Classification`, `TraitStats`, `TraitVector`, `TRAIT_DIRECTION`, `GenomicProfile`, `CaseinOdds`, `FilterResult`, `ExplanationFacts`, `Need`, `Capability`, `Provider`, `MatchCandidate`, `MatchBoard`, `FitBreakdown`, `VerticalEngine`. Fixtures `herd-farm-a.json`, `bulls.seed.json`, `providers.json`, `needs.samples.json`, `farms.json`.

## ADDED Requirements

### Requirement: REQ-A-01 Filtros duros del núcleo genérico
`hardFilters` SHALL evaluar, en este orden y con un `FilterResult` por regla con `rule: 'RN-31'`, que: la categoría de la capacidad coincida con la de la necesidad; la distancia entre `need.where` y `prov.base` no supere `cap.coverageRadiusKm`; `need.window` se superponga con al menos una `cap.availability`; si hay `need.magnitude` y `cap.capacityPerDay`, la capacidad multiplicada por los días de la ventana alcance la magnitud; toda certificación de `need.constraints` que empiece con `cert:` esté en `cap.certifications`. Cada descarte SHALL llevar su motivo en `detail` en español.

#### Scenario: Fuera de cobertura
- **GIVEN** una necesidad en Río Cuarto y un proveedor con base a 180 km y `coverageRadiusKm: 120`
- **WHEN** se llama `hardFilters(need, cap, prov)`
- **THEN** el resultado incluye `{ rule: 'RN-31', passed: false, detail }` con `detail` mencionando "180 km" y "120 km", y `matchNeed` lo deja en `excluded`

#### Scenario: Capacidad insuficiente
- **GIVEN** una necesidad de 40 ha con ventana de 5 días y una capacidad de 5 ha/día
- **WHEN** se llama `hardFilters`
- **THEN** el filtro de capacidad falla con un `detail` que dice cuántas ha puede hacer en la ventana (25) frente a las 40 pedidas

#### Scenario: Sin superposición de ventanas
- **GIVEN** `need.window` del 10 al 15 y `cap.availability` del 20 al 30 del mismo mes
- **WHEN** se llama `hardFilters`
- **THEN** el filtro de disponibilidad falla y el candidato va a `excluded`

#### Scenario: Todo pasa
- **GIVEN** un proveedor a 32 km con cobertura 100 km, disponible en la ventana y con capacidad de sobra
- **WHEN** se llama `hardFilters`
- **THEN** todos los `FilterResult` tienen `passed: true`

### Requirement: REQ-A-02 Score genérico determinístico y compatibilidad relativa
`scoreCandidate` SHALL calcular `fit` con cinco componentes en 0..1 (`proximity`, `availability`, `capacity`, `price`, `reputation`) y `score` como suma ponderada fija sin ninguna llamada a un LLM (RN-32). `matchNeed` SHALL reescalar `score` a `compatibility` 0..100 por min-max entre los `ranked` de esa necesidad, en un solo paso y sobre todos los candidatos, genéricos o del vertical (RN-33, ADR-0002), y SHALL asignar `rank` de 1 a n sin huecos. Un proveedor sin reputación (`avg: null`) SHALL puntuar `reputation: 0` y decirlo en `reasons`; nunca se rellena con un promedio.

#### Scenario: El mejor sale primero con 100
- **GIVEN** tres proveedores que pasan los filtros: uno a 32 km disponible y con `avg: 4.8`, otro a 90 km, otro sin reputación
- **WHEN** se llama `matchNeed(need, caps, provs, [])`
- **THEN** el de 32 km es `rank: 1` con `compatibility: 100`, los tres tienen `compatibility` entre 0 y 100, `rank` es `[1, 2, 3]` y el sin reputación tiene una `reason` que dice que no tiene valoraciones

#### Scenario: Un solo candidato
- **WHEN** solo un proveedor pasa los filtros
- **THEN** su `compatibility` es 100 y `rank` es 1

#### Scenario: Sin LLM
- **WHEN** se inspeccionan las dependencias de `matching-core`
- **THEN** no importa `@anthropic-ai/sdk`, `@org/ai` ni ningún puerto de IA

### Requirement: REQ-A-03 Registro de verticales y delegación del score
`registerVertical` SHALL registrar un `VerticalEngine` por categoría; `listVerticals` SHALL devolverlos. `matchNeed` SHALL llamar `engine.score(need, candidate, ctx)` **una vez por candidato** que pasó los filtros duros cuando `engine.canHandle(need)` es `true`, SHALL usar ese score crudo en lugar del genérico, SHALL guardar `facts` en `verticalFacts` y SHALL fusionar `reasons`. Un candidato para el que el vertical devuelva `score: -Infinity` SHALL ir a `excluded` con `MatchCandidate.filters` igual a los `FilterResult` que el vertical puso en `facts.filters` y su `detail` fusionado en `reasons` (RN-35, ADR-0002; ver Q7). `matching-core` SHALL no importar nada de `genetics-core`.

#### Scenario: Vertical registrado
- **GIVEN** `GeneticsVertical` registrado y una `Need` con `category: 'GENETICS'` y 12 capacidades-toro
- **WHEN** se llama `matchNeed(need, caps, provs, listVerticals(), ctx)`
- **THEN** `engine.score` fue invocado exactamente una vez por toro que pasó los filtros, cada `ranked[i].verticalFacts` es un `ExplanationFacts` válido y el orden es el del score genético, no el de cercanía

#### Scenario: Sin vertical para la categoría
- **GIVEN** una `Need` de `MACHINERY` y solo `GeneticsVertical` registrado
- **WHEN** se llama `matchNeed`
- **THEN** `canHandle` devuelve `false` y se usa `scoreCandidate` genérico; ningún candidato tiene `verticalFacts`

#### Scenario: Aislamiento de paquetes
- **WHEN** corre el test de dependencias
- **THEN** ningún archivo de `packages/matching-core/src` importa `@org/genetics-core` ni una ruta relativa hacia él

### Requirement: REQ-A-04 Rasgos, categoría y cría esperada
`expectedProgeny` SHALL devolver `(dam[k] + sire[k]) / 2` por rasgo (RN-02). `normalize(value, key, stats)` SHALL devolver `TRAIT_DIRECTION[key] · (value − stats.mean[key]) / stats.std[key]` (RN-03), con `std === 0` → 0. `computeTraitStats` SHALL calcular media y desvío por rasgo sobre los perfiles recibidos. `deriveCategory` SHALL devolver `CALF` con menos de 12 meses, `HEIFER` de 12 a 30 y `COW` con más de 30 (aproximación documentada en el código).

#### Scenario: Cría esperada
- **WHEN** se llama `expectedProgeny({ milk: 699, … }, { milk: -100, … })`
- **THEN** `.milk === 299.5`

#### Scenario: Dirección de los rasgos
- **GIVEN** `stats` con `mean.scs = 3.0`, `std.scs = 0.2`, `mean.rfi = 0`, `std.rfi = 50`
- **WHEN** se llama `normalize(2.8, 'scs', stats)` y `normalize(-50, 'rfi', stats)`
- **THEN** los dos devuelven `+1` (menos es mejor, el signo se invierte); `normalize(3.2, 'scs', stats)` devuelve `-1`

#### Scenario: Estadísticas del rodeo real
- **WHEN** se llama `computeTraitStats` con los perfiles de `herd-farm-a.json`
- **THEN** `mean.ci` está en 412,9 ± 0,1

#### Scenario: Categoría por edad
- **WHEN** se llama `deriveCategory` con 11, 12, 30 y 31 meses de diferencia respecto de `today`
- **THEN** devuelve `CALF`, `HEIFER`, `HEIFER`, `COW`

### Requirement: REQ-A-05 Caseínas por Mendel
`caseinOdds` SHALL devolver la probabilidad de que la cría sea `A2/A2` y `BB` asumiendo que cada padre aporta un alelo con probabilidad 50% (RN-04). Si a cualquiera de los dos padres le falta el dato de una caseína, el valor correspondiente SHALL ser `null`, nunca 0.

#### Scenario: Beta caseína
- **WHEN** se calcula para `A2/A2 × A2/A2`, `A1/A2 × A2/A2`, `A1/A2 × A1/A2`, `A1/A1 × A2/A2`
- **THEN** `betaA2A2` es `1`, `0.5`, `0.25`, `0`

#### Scenario: Kappa caseína
- **WHEN** se calcula para `AB × BB`, `BE × BB`, `EE × BB`
- **THEN** `kappaBB` es `0.5`, `0.5`, `0`

#### Scenario: Dato faltante
- **GIVEN** una madre con `betaCasein: null` y un toro `A2/A2`
- **WHEN** se llama `caseinOdds`
- **THEN** `betaA2A2 === null` y `kappaBB` se calcula igual si los dos tienen kappa

### Requirement: REQ-A-06 Filtros de consanguinidad y facilidad de parto
`inbreedingFilter` SHALL devolver `{ rule: 'RN-05', passed: false }` si `bull.naab === female.sireNaab` (25%) o si `bull.sireNaab !== null && bull.sireNaab === female.sireNaab` (12,5%), con el porcentaje en `detail`. Si `female.sireNaab === null` SHALL devolver `passed: true` con `detail` "sin padre registrado: no se pudo controlar" (RN-24). `calvingEaseFilter` SHALL devolver `{ rule: 'RN-06', passed: false }` para `HEIFER` o `CALF` si `bull.calvingEase === null` o `bull.calvingEase > farm.calvingEaseMaxHeifer`; una `COW` SHALL pasar siempre.

#### Scenario: El toro es el padre
- **WHEN** `bull.naab === female.sireNaab`
- **THEN** `passed: false` y `detail` contiene "25%"

#### Scenario: Medio hermano
- **WHEN** `bull.sireNaab === female.sireNaab` y ambos no nulos
- **THEN** `passed: false` y `detail` contiene "medio hermano" y "12,5%"

#### Scenario: Hembra sin padre
- **WHEN** `female.sireNaab === null`
- **THEN** `passed: true` y `detail` dice que no se pudo controlar

#### Scenario: Vaquillona con toro de parto difícil o sin dato
- **GIVEN** `farm.calvingEaseMaxHeifer = 2.5`
- **WHEN** una `HEIFER` se evalúa contra un toro con `calvingEase: 3.1` y contra otro con `calvingEase: null`
- **THEN** los dos dan `passed: false`; el de `null` dice en `detail` que falta el dato

#### Scenario: Vaca adulta
- **WHEN** una `COW` se evalúa contra un toro con `calvingEase: 6`
- **THEN** `passed: true`

### Requirement: REQ-A-07 Score genético de un par hembra × toro
`scoreOneCandidate` SHALL: (1) rechazar el toro cuyo `semenTypes` no incluya `classification.semenType` (RN-13) o que no pase `inbreedingFilter` / `calvingEaseFilter`, devolviendo `score: -Infinity` con los `FilterResult` fallidos en `facts.filters` y su `detail` en `reasons`; (2) para toros lecheros, calcular `score = Σ goal.weights[k] · normalize(expectedProgeny[k], k, stats)` sumando `0.5 · P(A2/A2)` si `goal.wantBetaA2` y `0.5 · P(BB)` si `goal.wantKappaBB`, con cada rasgo de `classification.corrective` **pesando el doble** (RN-09, RN-14, ADR-0001); (3) para toros de carne, un score que ordene por `calvingEase` ascendente, luego `breed`, luego `pricePerDose` ascendente (RN-16); (4) si al toro le falta un rasgo que el objetivo pesa, ese término SHALL valer 0 y `reasons` SHALL decirlo; nunca se rellena con un promedio; (5) `company` y `name` SHALL no participar del cálculo (RN-34).

#### Scenario: La ternera 3031 se rescata
- **GIVEN** la hembra `3031` de `herd-farm-a` (SCS 3,19, `corrective: ['scs']`, tier `COMMERCIAL`), objetivo `SOLIDS_CHEESE` y `bulls.seed.json`
- **WHEN** se llama `scoreCandidates`
- **THEN** el `ranked[0]` es un toro con `profile.traits.scs ≤ 2.80` y su `verticalFacts.expectedProgeny.scs < 3.00`

#### Scenario: Neutralidad
- **GIVEN** cualquier hembra y el catálogo completo
- **WHEN** se llama `scoreCandidates` con el catálogo original y de nuevo con `company: 'X'` en todos los toros
- **THEN** los dos `MatchBoard` tienen el mismo orden de `naab`, los mismos `score` y las mismas `compatibility`

#### Scenario: Catálogo por tier
- **GIVEN** una hembra `ELITE` (`semenType: 'SEXED'`)
- **WHEN** se llama `scoreCandidates`
- **THEN** todo `ranked[i]` corresponde a un toro con `'SEXED'` en `semenTypes`; los toros solo `CONVENTIONAL` y los de carne están en `excluded` con `rule: 'RN-13'`

#### Scenario: CULL_ALERT no tiene candidatos
- **GIVEN** una `Classification` con `tier: 'CULL_ALERT'` y `semenType: null`
- **WHEN** se llama `scoreCandidates`
- **THEN** `ranked` está vacío y `excluded` contiene todos los toros con una `reason` que dice que la hembra está en alerta de descarte

#### Scenario: Rasgo faltante en el toro
- **GIVEN** un toro lechero sin `traits.rfi` y objetivo `EFFICIENCY`
- **WHEN** se llama `scoreOneCandidate`
- **THEN** el término de `rfi` vale 0, el toro compite igual y `reasons` incluye una línea que dice que falta ese rasgo

#### Scenario: Correctivos acumulados no dominan
- **GIVEN** una hembra con `corrective: ['scs', 'pl']` y objetivo `SOLIDS_CHEESE`
- **WHEN** se compara el `ranked` con el de la misma hembra sin `corrective`
- **THEN** el toro #1 cambia hacia uno con mejor SCS y PL, pero un toro con SCS y PL excelentes y proteína/grasa muy por debajo de la media **no** queda #1: la suma de los pesos duplicados no supera la suma del resto de los pesos del objetivo

#### Scenario: Toros de carne
- **GIVEN** una hembra `BEEF` y los 3 toros de carne de la semilla
- **WHEN** se llama `scoreCandidates`
- **THEN** están ordenados por `calvingEase` ascendente y, a igualdad, por `pricePerDose` ascendente; ninguno tiene `expectedProgeny` (es `null`)

### Requirement: REQ-A-08 Compatibilidad y ranking en el batch genético
`scoreCandidates` SHALL construir un `MatchBoard` a partir de `scoreOneCandidate` para cada toro: los de `score: -Infinity` en `excluded` con sus `filters`; los demás en `ranked` con `compatibility` por min-max 0..100 (un solo candidato → 100) y `rank` de 1 a n sin huecos (RN-15). Cada `MatchCandidate` SHALL tener `capabilityId === bull.naab`, `verticalFacts: ExplanationFacts` y `fit.vertical` igual a `compatibility / 100`.

#### Scenario: Hija de 029HO19531
- **GIVEN** una hembra con `sireNaab: '029HO19531'` y la semilla con `029HO19531` y sus 2 hijos
- **WHEN** se llama `scoreCandidates`
- **THEN** `029HO19531` y sus 2 hijos están en `excluded` con `filters` que incluyen `{ rule: 'RN-05', passed: false }`

#### Scenario: Compatibilidad bien formada
- **WHEN** se llama `scoreCandidates` con cualquier hembra clasificada y objetivo
- **THEN** `ranked[0].compatibility === 100`, todas están en 0..100, `rank` es `1..n` consecutivo y `ranked` está ordenado por `score` descendente

### Requirement: REQ-A-09 Hechos para la explicación
`toExplanationFacts` SHALL construir un `ExplanationFacts` completo (RN-17) y `scoreOneCandidate` SHALL llamarlo internamente para poblar `facts`. Cada número que aparezca en `reasons` SHALL existir literalmente (con redondeo a 1 decimal) dentro de `ExplanationFacts` (`damTraits`, `expectedProgeny`, `deltaVsDam`, `caseinOdds`, `compatibility`, `rank`, `totalCandidates`): es el invariante que `mvp-d-match` (C4) usa para el control de alucinación (RN-18). Las `reasons` SHALL estar en español rioplatense y ser determinísticas.

#### Scenario: Invariante de números
- **WHEN** se toma cualquier `{ facts, reasons }` de `scoreOneCandidate` sobre `herd-farm-a × bulls.seed`
- **THEN** todo número extraído de `reasons` con una expresión regular aparece en los valores numéricos de `facts` con tolerancia 0,05

#### Scenario: Snapshot 3031
- **WHEN** se llama `scoreOneCandidate` para `3031` × el toro #1 con `SOLIDS_CHEESE`
- **THEN** `facts` coincide con el snapshot del test y `reasons` incluye una línea con la forma "La cría esperada mejora SCS de 3,19 a X,XX"

#### Scenario: Hembra sin perfil
- **GIVEN** una hembra con `profile: null`
- **WHEN** se llama `toExplanationFacts`
- **THEN** `damTraits`, `expectedProgeny` y `deltaVsDam` son `null` y `caseinOdds` es `{ betaA2A2: null, kappaBB: null }`

### Requirement: REQ-A-10 GeneticsVertical como VerticalEngine
`GeneticsVertical` SHALL tener `category: 'GENETICS'`, `canHandle(need)` SHALL devolver `true` solo para `need.category === 'GENETICS'`, y `score(need, candidate, ctx)` SHALL resolver el toro por `ctx.bullsByNaab[candidate.capabilityId]` y delegar en `scoreOneCandidate(ctx.female, ctx.classification, bull, need.goal, ctx.stats)` devolviendo el score **crudo** (ADR-0002). Si `need.goal` falta o `ctx` no tiene la forma de `GeneticsMatchContext`, SHALL lanzar un error con mensaje claro.

#### Scenario: canHandle
- **WHEN** se llama `canHandle` con una `Need` de `GENETICS` y otra de `VET`
- **THEN** devuelve `true` y `false`

#### Scenario: Mismo resultado por los dos caminos
- **GIVEN** la hembra `3031`, su clasificación, el catálogo y el objetivo `SOLIDS_CHEESE`
- **WHEN** se calcula `scoreCandidates(...)` y, por otro lado, `matchNeed(makeGeneticsNeedLike, capsFromBulls, provs, [GeneticsVertical], ctx)`
- **THEN** los dos `MatchBoard` tienen el mismo orden de `capabilityId`, las mismas `compatibility` y los mismos `verticalFacts`

### Requirement: REQ-A-11 Catálogo real de toros (P1, lo primero que se cae)
`packages/shared-types/fixtures/bulls.json` SHALL contener entre 20 y 30 toros reales de catálogos públicos de ABS, Genex y Semex Argentina cruzados con CDCB, cada uno con `source` citada, e incluir: los padres que aparecen en `herd-farm-a.json`, al menos 2 hijos de `029HO19531`, toros `A2/A2` y `BB`, y 4 de carne con `calvingEase`. Todo lechero SHALL tener `profile.scale: 'CDCB'`. Si A6 se cae, la demo sigue con `bulls.seed.json` (mismo esquema).

#### Scenario: Validación del catálogo real
- **WHEN** corre el test que parsea `bulls.json` con `BullSchema`
- **THEN** pasa, hay entre 20 y 30 toros, ningún lechero tiene `scale` distinta de `'CDCB'` y `source` no está vacío en ninguno

#### Scenario: Cobertura de la demo
- **WHEN** se cruza `bulls.json` con los `sireNaab` de `herd-farm-a.json`
- **THEN** todos los padres del rodeo están en el catálogo y hay ≥ 2 toros con `sireNaab: '029HO19531'`

**— Anexo reasignable: Chat sobre el rodeo —**

### Requirement: REQ-A-CHAT-01 El chat responde solo con datos de las herramientas
`ChatPort.ask(farmId, question, tools)` SHALL usar `LlmClient` para decidir cuál de exactamente tres herramientas invocar (`countByTier`, `listFemales`, `explainClassification`), SHALL responder **solo** con los datos que esas herramientas devolvieron, y SHALL informar en `usedTools` cuáles usó (RN-17, RN-20). No SHALL ejecutar acciones, armar planes ni modificar datos.

#### Scenario: Cuántas terneras van a carne
- **GIVEN** `farm-a` clasificada
- **WHEN** se pregunta "¿cuántas terneras van a carne?"
- **THEN** `usedTools` incluye `'countByTier'` y el número del texto coincide con `byTier.BEEF` del resumen de clasificación

#### Scenario: Pregunta que no se puede responder con herramientas
- **WHEN** se pregunta "¿qué toro me conviene comprar?"
- **THEN** el texto dice que eso se ve en el swipe y `usedTools` está vacío

### Requirement: REQ-A-CHAT-02 Endpoint del chat con herramientas sobre los repositorios
`POST /farms/:farmId/chat` con `{ question }` SHALL devolver `ChatAnswer`, pasando a `ChatPort` una implementación de `HerdQueryTools` construida sobre `FemaleRepo` y `ClassificationRepo` del establecimiento. SHALL respetar el aislamiento (403 en tambo ajeno) y SHALL responder 409 `HERD_NOT_CLASSIFIED` si el rodeo no está clasificado.

#### Scenario: Herramientas sobre el tambo correcto
- **GIVEN** `tambero-a` y `farm-a` clasificada
- **WHEN** hace `POST /api/farms/farm-a/chat` con "¿cuáles me sirven para vender leche A2?"
- **THEN** `usedTools` incluye `'listFemales'` con filtro `tag: 'A2_NUCLEUS'` y ninguna hembra de la respuesta pertenece a otro tambo

### Requirement: REQ-A-CHAT-03 Panel lateral del chat dentro del módulo Motor genético
El chat SHALL llenar el panel lateral derecho que `frontend-shell` reserva (REQ-FS-09): visible solo en las rutas `/motor-genetico/*`, colapsado por defecto, abierto desde el botón del `Topbar`, atado al `farmId` activo. El panel (`ChatThread` + `ChatBubble` + `ChatComposer`) SHALL mostrar la pregunta, la respuesta y las herramientas usadas. Una respuesta con `usedTools` vacío SHALL marcarse como no verificada con `AiExplanation source="FALLBACK"`. Hasta que este anexo se implemente, el hueco SHALL seguir mostrando el `EmptyState` "Chat · pendiente" del shell.

#### Scenario: Respuesta con herramienta
- **GIVEN** el usuario está en `/motor-genetico/tablero` y abre el chat desde el `Topbar`
- **WHEN** pregunta "¿cuántas terneras van a carne?"
- **THEN** ve el número y un indicador con `countByTier`

#### Scenario: Respuesta sin herramienta
- **WHEN** la respuesta llega con `usedTools: []`
- **THEN** la burbuja lleva el indicador `FALLBACK` visible

#### Scenario: El chat no existe fuera del módulo
- **WHEN** el usuario navega a `/mercado`
- **THEN** no hay botón de chat en el `Topbar` ni panel lateral renderizado

## Reglas que respeta

RN-02, RN-03 (REQ-A-04) · RN-04 (REQ-A-05) · RN-05, RN-06, RN-24 (REQ-A-06) · RN-09 y **ADR-0001** (correctivo duplica el peso; REQ-A-07) · RN-13, RN-14, RN-16 (REQ-A-07) · RN-15, RN-33 (REQ-A-02, REQ-A-08) · RN-17, RN-18 (REQ-A-09, REQ-A-CHAT-01) · RN-20 (anexo) · RN-22 (`naab` como clave del catálogo) · RN-23/RN-34 (neutralidad, REQ-A-07) · RN-31, RN-32 (REQ-A-01, REQ-A-02) · RN-35 y **ADR-0002** (REQ-A-03, REQ-A-10) · RN-38 (anexo) · ADR-0003 (REQ-A-11: sin CDCB no entra) · `motor-datos-de-toros.md` §3 y "regla de oro sobre los faltantes".

**Dependencia cruzada (no es requisito de A, lo verifica D en `mvp-d-match`):** el criterio de integración real de M3 es que `POST /farms/:farmId/females/:femaleId/matches` pase por `matchNeed` con `GeneticsVertical` registrado, no que llame a `scoreCandidates` directo. A entrega REQ-A-10 y el escenario "mismo resultado por los dos caminos" para que D lo pueda comprobar en I2.

## Criterios de aceptación

Son los tests Vitest de `packages/matching-core/test` y `packages/genetics-core/test` (convenciones §1: tests solo en los núcleos):

- [ ] `expectedProgeny({milk: 699}, {milk: -100}).milk === 299.5`; `normalize` invierte el signo en `scs` y `rfi`; `deriveCategory` en 11/12/30/31 meses; `computeTraitStats(herd-farm-a).mean.ci ≈ 412.9 ± 0.1`.
- [ ] `caseinOdds`: 1 / 0,5 / 0,25 / 0 en beta; 0,5 / 0,5 / 0 en kappa; `null` con dato faltante.
- [ ] `inbreedingFilter`: padre → 25%; medio hermano → 12,5%; sin padre → pasa con aviso. `calvingEaseFilter`: `HEIFER` con `> 2.5` o `null` → no pasa; `COW` pasa.
- [ ] 3031 + `SOLIDS_CHEESE`: #1 con SCS ≤ 2,80 y cría con SCS < 3,00.
- [ ] Hija de `029HO19531`: `029HO19531` y sus hijos en `excluded` con RN-05.
- [ ] Neutralidad: `company: 'X'` en todos → ranking idéntico.
- [ ] `compatibility` del #1 = 100, todas en 0..100, `rank` sin huecos; con un solo candidato → 100.
- [ ] Correctivos acumulados (`['scs','pl']`) no dominan el ranking.
- [ ] Toro sin un rasgo pesado compite con término 0 y `reason` explícita.
- [ ] Toros de carne por `calvingEase` asc → `breed` → `pricePerDose` asc.
- [ ] Invariante RN-18: todo número de `reasons` está en `facts` (tolerancia 0,05). Snapshot 3031 × #1.
- [ ] `hardFilters`: 180 km / 120 km → excluido; 40 ha en 5 días vs 5 ha/día → excluido; sin superposición → excluido.
- [ ] `matchNeed` genérico: el más cercano, disponible y mejor calificado es #1 con 100.
- [ ] `matchNeed` con `GeneticsVertical`: `score` llamado una vez por candidato, `verticalFacts` guardado, mismo `MatchBoard` que `scoreCandidates`.
- [ ] Test de dependencias: `matching-core` no importa `genetics-core`.
- [ ] (P1) `bulls.json` valida contra `BullSchema`, 20–30 toros, todos los lecheros `CDCB`, padres del rodeo presentes, ≥ 2 hijos de `029HO19531`.
- [ ] (Anexo, verificación manual con los fakes y luego con Claude) desde `/motor-genetico/tablero`, abrir el chat y preguntar "¿cuántas terneras van a carne?" → `countByTier` y el número coincide con el resumen; respuesta sin herramienta → `FALLBACK` en la UI; en `/mercado` el panel no existe.

## Riesgos y supuestos

- **Riesgo (ADR-0001):** con varios rasgos correctivos acumulados el bono duplicado puede dominar. Mitigación: escenario y test explícitos en REQ-A-07; si domina, se ajusta el multiplicador (parámetro interno de A4) sin cambiar la firma.
- **Riesgo:** `bulls.seed.json` no tiene un toro con SCS ≤ 2,80 y `CONVENTIONAL`, y el test de 3031 no puede pasar. Mitigación: la sección *Riesgos* de `shared-contracts` prevé al menos 3 lecheros con `scs ≤ 2.80` y `CONVENTIONAL` en la semilla (no es un requisito formal, ver Q6); si no están, se corrige el fixture, no el test.
- **Supuesto:** la distancia geográfica se calcula con haversine sobre `GeoPoint`; alcanza para "180 km vs 120 km". No hay geocodificación en el motor: `where` llega ya con `lat/lng` desde el intake (B).
- **Supuesto:** los pesos fijos del score genérico (RN-32) son una decisión de A; el handoff no los fija. Se documentan en el código y en Q3.
- **Riesgo:** `-Infinity` como señal de "excluido por el vertical" es una convención interna entre `matchNeed` y `GeneticsVertical`. Se documenta en las dos funciones; si aparece un segundo vertical, se formaliza como campo del retorno (aditivo).
- **Supuesto (anexo):** el LLM elige herramientas con `tool_use` estándar del SDK; las tres herramientas se declaran con `strict: true` y esquema zod.

## Preguntas abiertas

| # | Pregunta | Default tomado acá | Quién cierra |
|---|---|---|---|
| Q1 | `toExplanationFacts` quedó con `/* ver mvp-a-core A5 */` en `contracts-v1`; hacía falta tipar su entrada | Se agrega `ToExplanationFactsInput` y `GeneticsMatchContext` como **aditivos** en `genetics-core` (no tocan `shared-types`) | Dev A al abrir A5; avisa por Notion |
| Q2 | Los pesos concretos de cada `GoalPreset` no están en ningún documento | La tabla de *Contratos*; suman 1 y respetan la intención del nombre | Dev A; el analista puede ajustarlos después sin cambiar firmas |
| Q3 | Los pesos del score genérico (`proximity`, `availability`, `capacity`, `price`, `reputation`) no están definidos | `0.35 / 0.20 / 0.15 / 0.15 / 0.15` | Dev A en M2; B puede pedir ajuste con el MSW ya andando |
| Q4 | Qué `constraints` de `Need` cuentan como certificación exigida en `hardFilters` | Las que empiezan con `cert:` (por ejemplo `cert:matriculado`); el resto son informativas | Dev A y Dev B (M4 las produce) |
| Q5 | Empate de `score` en el ranking | `providerId` ascendente para que sea determinista | Dev A |
| Q6 | En 3031 el toro #1 tiene que ser `CONVENTIONAL` (es `COMMERCIAL`); si la semilla solo tiene SCS ≤ 2,80 en toros `SEXED`, el test falla | La semilla debe tener ≥ 3 lecheros con `scs ≤ 2.80` **y** `CONVENTIONAL` | Semilla, al armar `bulls.seed.json` |
| Q7 | `VerticalEngine.score()` devuelve `{ score, facts, reasons }`: no tiene un lugar tipado para los `FilterResult` fallidos del vertical, y `MatchCandidate.filters` los necesita para la pestaña de excluidos (`mvp-d-match` REQ-D-09) | `ExplanationFacts.filters?: FilterResult[]`; `scoreOneCandidate` lo llena y `matchNeed` lo copia a `MatchCandidate.filters`. Misma convención en `mvp-d-match` Q6. ✅ El campo ya está en `contracts-v1` (`mvp-0-foundation` Q5) | Dev A lo implementa |

## Anexo reasignable — Chat sobre el rodeo (C6 + B7 + D8)

**Dueño por defecto:** Dev A, cuando termina el motor (~hora 8,5). **Reasignable** a quien vaya más holgado sin reescribir nada: este anexo es autocontenido. **Prioridad P1; es de lo primero que se cae** junto con A6.

### Propósito
Paso 5 de la narración del MVP (`baseline.md` §1b): el productor pregunta "¿cuántas terneras van a carne?" y el sistema responde **con sus datos** y muestra de dónde los sacó.

### Alcance
**Entra:** `ChatPort` real (C6) en `packages/ai/src/chat.ts` sobre `LlmClient`, con exactamente tres herramientas; `POST /farms/:farmId/chat` (la mitad del chat de B7) en `apps/backend/src/chat/*` con `HerdQueryTools` implementadas sobre `FemaleRepo` y `ClassificationRepo`; el panel lateral (D8) en `apps/frontend/src/features/chat/*` con `ChatThread`, `ChatBubble`, `ChatComposer` y `AiExplanation`, montado en el hueco que deja `frontend-shell` REQ-FS-09 (panel derecho del shell, solo en `/motor-genetico/*`, colapsado, botón en el `Topbar`). El contenido sigue `pantallas.md §3.7`; la ubicación la fija `frontend-shell`, no `pantallas.md §1`.
**Queda afuera:** que ejecute acciones, arme planes, modifique datos o consulte proveedores; historial persistido; más de tres herramientas; un ítem propio en el sidebar o una tab (el chat no es destino de navegación). **`POST /goals/parse` (la otra mitad de B7) es de `mvp-d-match` (C5).**

### Contratos
Consume `ChatPort`, `ChatAnswer`, `HerdQueryTools` y `LlmClient` de `contracts-v1`; la ruta `POST /farms/:farmId/chat` de `api.ts`; `CHAT_PORT` del módulo `ai` de `api-skeleton` (al publicar el adaptador real, se cambia esa única línea). Herramientas expuestas al LLM, una a una y con `strict: true`:

| Herramienta | Entrada | Salida |
|---|---|---|
| `countByTier` | `{ farmId }` (lo inyecta la API, el LLM no lo elige) | `Record<Tier, number>` |
| `listFemales` | `{ tier?, tag?, limit? }` (`limit` máximo 20) | `Female[]` reducidas a `visualId`, `category`, `tier`, `tags` |
| `explainClassification` | `{ femaleId }` (acepta `visualId`) | `string[]` = `Classification.reasons` |

### Reglas
RN-17 (el LLM no calcula: cuenta la herramienta), RN-18 (respuesta sin herramienta → marcada `FALLBACK`), RN-20, RN-38 (las herramientas nacen atadas al `farmId` del request).

### Criterios de aceptación (verificación manual, el PR dice cómo)
- [ ] Desde `/motor-genetico/tablero`, el botón del `Topbar` abre el panel derecho con el chat; en `/mercado` ni el botón ni el panel existen.
- [ ] Con `FakeChat`: la pantalla muestra la respuesta fija y `countByTier`.
- [ ] Con Claude en vivo: "¿cuántas terneras van a carne?" → `countByTier`, número igual al de `GET /classifications/summary`.
- [ ] "¿cuáles me sirven para vender leche A2?" → `listFemales` con `tag: 'A2_NUCLEUS'`, lista de `visualId`.
- [ ] "¿por qué la 3031 es comercial?" → `explainClassification`, texto que incluye la mastitis.
- [ ] `tambero-b` preguntando por `farm-a` → 403; rodeo sin clasificar → 409 `HERD_NOT_CLASSIFIED`.
- [ ] Una respuesta con `usedTools: []` se ve con `FALLBACK`.

### Riesgos
- El LLM "conversa" sin llamar herramientas cuando la pregunta es vaga: se acepta y se marca `FALLBACK`; el prompt del sistema le dice que si no puede usar una herramienta, lo diga.
- Latencia de dos vueltas (elegir herramienta + redactar): aceptable para la demo; `cache_control` en el system prompt.
- Si se cae: la narración pierde el paso 5, no el recorrido principal, y el hueco del shell queda con su `EmptyState` "Chat · pendiente" (honesto, no roto).
