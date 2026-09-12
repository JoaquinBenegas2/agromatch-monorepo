# ADR-0002: El vertical genético queda enchufado al núcleo, no es un subsistema aparte

> Resuelve la ambigüedad entre RN-35 (verticales enchufables) y lo que el plan describía en la práctica. Afecta M2, M3, M5, A4, A5, B4, B5, D4 y los contratos de `shared-types`.

## Estado

**Aceptada.** Se corrige antes de T0 — los contratos todavía no están congelados.

## Contexto

RN-35 dice: *"si la categoría tiene un `VerticalEngine`, su score reemplaza al componente genérico y sus hechos entran en la explicación."* El diagrama de arquitectura muestra `matching-core → genetics-core`, como si el segundo dependiera del primero en tiempo de ejecución.

Pero el plan tal como estaba escrito describía dos caminos que nunca se tocan:

1. **El camino genérico:** `M2` (`matchNeed`, `registerVertical`) → `M5` (`POST /needs/:id/matches`) → `M6` (pantalla "¿Qué necesitás?"). Usa el tipo `MatchCandidate` / `MatchBoard`.
2. **El camino de Torinder:** `B4` expone su propio `POST /matches`, que llama **directo** a `scoreCandidates` (A4) sin pasar por `matchNeed` ni por ningún `VerticalEngine` registrado. Usa un tipo **distinto**, `MatchResult` / `MatchSet`, que nunca se convierte a `MatchCandidate`. `D4` (swipe) depende de `B4`, no de `M5`.

`M3` ("Genética como vertical") sí produce un `GeneticsVertical: VerticalEngine<ExplanationFacts>` y lo prueba — pero **ese test corre en aislamiento**. En el recorrido real de la demo (I1/I2), el swipe nunca ejercita `matchNeed` ni `registerVertical`. RN-35 está escrita pero no se cumple: hay dos motores de matcheo en el mismo producto, y el segundo vertical que alguien quiera sumar (mecanización, nutrición) no tiene un camino real para copiar — tendría que inventarse su propio subsistema, como Torinder.

## Decisión

**El vertical genético usa el mismo pipeline que cualquier otro vertical futuro.** En concreto:

1. **Se elimina la duplicación de tipos.** `MatchResult` y `MatchSet` desaparecen de los contratos. Todo vive en `MatchCandidate` / `MatchBoard`, con `verticalFacts: ExplanationFacts` para genética.
2. **Cada `Bull` es una `Capability`** de categoría `GENETICS`, ofrecida por un `Provider` de tipo `SemenCompany`. `capabilityId` = `bull.naab`.
3. **El swipe crea (o reutiliza) un `Need` sintético.** Al abrir el swipe de una hembra, el backend arma un `Need { category: 'GENETICS', farmId, constraints: [femaleId, goal] }` y lo confirma en el mismo paso — **invisible para el productor**, que sigue viendo la pantalla dedicada de Torinder (M6 sigue redirigiendo ahí, eso no cambia).
4. **`B4` deja de llamar a `scoreCandidates` directo.** Internamente arma el `Need` sintético y llama a `matchNeed(...)` de `matching-core`, con `GeneticsVertical` registrado. **El contrato HTTP que ve el frontend (`D4`) no cambia** — sigue siendo `POST /matches` con la misma forma de respuesta; lo que cambia es qué hay adentro del handler.
5. **`VerticalEngine.score()` se llama una vez por par hembra×toro** y devuelve el score **crudo**, sin reescalar. El reescalado 0–100 relativo (RN-15 / RN-33) lo hace `matchNeed` en un solo paso, sobre **todos** los candidatos de esa necesidad — genéricos o de vertical. Así no se duplica la lógica de "relativo al conjunto" en cada vertical que se sume después.
6. **`A4` se reparte en dos funciones:**
   - `scoreOneCandidate(female, classification, bull, goal, stats)` → par hembra×toro, es la que usa `GeneticsVertical.score()`.
   - `scoreCandidates(...)` sigue existiendo como conveniencia por encima de `scoreOneCandidate`, para los usos que no pasan por `/needs` (por ejemplo `buildAutoPlan` en B5).
7. **`classifyHerd` (B2, ADR-0001) no cambia de lugar.** Sigue siendo un paso previo al matching, no un match en sí — determina qué catálogo de toros (por `semenTypes` según el tier) entra como candidatos del `Need` sintético.

### Contratos actualizados (reemplazan lo que había en T0.5 / T0.5b)

```ts
// Se borran MatchResult y MatchSet.

export interface VerticalEngine<TFacts = unknown> {
  category: NeedCategory;
  canHandle(need: Need): boolean;
  // se llama una vez por candidato; devuelve el score CRUDO, matchNeed reescala.
  score(need: Need, candidate: MatchCandidate, ctx: unknown):
    { score: number; facts: TFacts; reasons: string[] };
}

export function scoreOneCandidate(
  female: Female, classification: Classification, bull: Bull,
  goal: BreedingGoal, stats: TraitStats,
): { score: number; facts: ExplanationFacts; reasons: string[] };            // A4

export function scoreCandidates(
  female: Female, classification: Classification, bulls: Bull[],
  goal: BreedingGoal, farm: Farm, stats: TraitStats,
): MatchBoard;                                                               // A4, sobre scoreOneCandidate

export function makeGeneticsNeed(farmId: string, femaleId: string, goal: BreedingGoal): Need; // B4
```

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Dejar a Torinder como subsistema aparte (lo que había) | No cumple RN-35 de verdad; el próximo vertical no tiene un camino real que copiar, solo un ejemplo que tampoco lo sigue |
| Sacar el swipe "tipo Tinder" y mostrar el `MatchBoard` genérico tal cual | Pierde la experiencia diferencial de la demo. No hace falta: alcanza con que el motor de **adentro** sea el mismo — la pantalla puede seguir siendo dedicada |

## Consecuencias

- `B4` pasa a depender de `M2` además de `A4` (antes solo dependía de `A4`). Hay que revisarlo en el diagrama de dependencias y en I1/I2.
- `M3` gana un criterio de aceptación real: un swipe de la demo (`B4`) efectivamente pasa por `matchNeed`, no solo el test aislado del vertical.
- Costo extra estimado: ~30–45 min en `B4` para el armado del `Need` sintético (`makeGeneticsNeed`) — ajustar el estimado de horas de esa tarea.
- Beneficio real: cuando se sume el próximo vertical (maquinaria, nutrición — hoja de ruta), hay un patrón probado en producción, no solo en un test.
- No afecta al ADR-0001 (tiers): `classifyHerd` sigue exactamente igual, esto solo toca el paso de matching (F3).

## Referencias

- [modelo-de-dominio.md](../modelo-de-dominio.md), RN-31 a RN-35, sección 10
- [plan-de-trabajo.md](../plan-de-trabajo.md), tareas M2, M3, A4, B4, D4
- [ADR-0001](0001-clasificacion-tiers-y-alertas-de-salud.md)
