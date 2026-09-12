# shared-contracts Specification

## Purpose

Define los tipos, esquemas y sustitutos que los cuatro devs importan desde el minuto 0 para trabajar en paralelo sin depender del código de otro: `@org/shared-types` (dominio, marketplace, puertos, rutas, zod, fixtures, fakes) y las firmas con stub de `@org/matching-core` y `@org/genetics-core`. Se congelan con el tag `contracts-v1`.

## Requirements

### Requirement: REQ-SC-01 Los contratos existen con la firma exacta y se importan desde todos los proyectos
`packages/shared-types` SHALL exportar los tipos, constantes e interfaces de la sección *Contratos* con esa firma exacta, importables como `@org/shared-types`. Los paquetes `@org/matching-core`, `@org/genetics-core` y `@org/ai` SHALL existir como librerías Nx de TypeScript puro e importarse desde `apps/backend` sin errores.

#### Scenario: Los cuatro devs importan los paquetes
- **WHEN** cualquier proyecto del monorepo importa `@org/shared-types`, `@org/matching-core` o `@org/genetics-core`
- **THEN** `npx nx run-many -t build` y `-t test` corren en verde y ningún import da error de resolución

#### Scenario: Los tipos se derivan de zod
- **WHEN** se lee un tipo de `domain.ts` o `marketplace.ts` que viaja entre paquetes
- **THEN** existe su esquema en `schemas.ts` y el tipo es `z.infer` de ese esquema; el mismo tipo no está definido dos veces en el repo

### Requirement: REQ-SC-02 Los contratos siguen ADR-0002
Los contratos SHALL reflejar el vertical enchufado al núcleo: no existen `MatchResult` ni `MatchSet`; el matching genético devuelve `MatchBoard` con `verticalFacts: ExplanationFacts`; cada `Bull` puede representarse como una `Capability` de categoría `GENETICS` cuyo `id` es su `naab`; `genetics-core` exporta `scoreOneCandidate` y `scoreCandidates`.

#### Scenario: Búsqueda de tipos borrados
- **WHEN** se busca `MatchResult` o `MatchSet` en `packages/` y `apps/`
- **THEN** no aparece ninguna definición ni uso

#### Scenario: Un toro como capacidad
- **WHEN** un `Bull` de `bulls.seed.json` se proyecta a `Capability`
- **THEN** la capacidad tiene `category: 'GENETICS'`, `id === bull.naab`, `providerId` igual al id del `Provider` de tipo `SEMEN_COMPANY` de esa central, y `serviceType: 'semen'`

### Requirement: REQ-SC-03 Los aditivos detectados están en los contratos
`Farm` SHALL incluir `scsGrayZone` y `plGrayZone` (ADR-0001) con defaults `{3.10, 3.18}` y `{0.00, 0.20}`; `Need` SHALL incluir `radiusKm?` y `createdAt`; `Review` SHALL incluir `createdAt`.

#### Scenario: Farm del fixture con zonas grises
- **WHEN** se parsea `farms.json` con `FarmSchema`
- **THEN** los tres tambos tienen `scsGrayZone: { from: 3.10, to: 3.18 }` y `plGrayZone: { from: 0.00, to: 0.20 }`

### Requirement: REQ-SC-04 Todo valor genético declara escala CDCB
Los esquemas `GenomicProfileSchema`, `FemaleSchema` y `BullSchema` SHALL rechazar un perfil cuyo `scale` no sea `'CDCB'` (RN-01).

#### Scenario: Perfil sin escala CDCB
- **WHEN** se valida un `Bull` con `profile.scale: 'ACHA'`
- **THEN** la validación falla y el toro no puede entrar a ningún fixture ni endpoint

### Requirement: REQ-SC-05 Los fixtures validan contra los esquemas y dicen lo que son
Cada archivo de `fixtures/` SHALL validar contra su esquema zod. Todo dato que no sea real SHALL declararlo en `source` (`"DEMO SINTÉTICO"`, `"SEED PROVISORIO"`) y todo proveedor semilla SHALL tener `verified: false` (RN-37).

#### Scenario: Validación de los fixtures
- **WHEN** corre el test de `shared-types` que parsea cada fixture con su esquema
- **THEN** los 293 animales de `herd-farm-a.json`, los 12 toros, los 3 tambos, los 4 usuarios y todos los proveedores pasan

#### Scenario: El rodeo real conserva sus rarezas
- **WHEN** se lee `herd-farm-a.json`
- **THEN** hay `visualId` no numéricos (por ejemplo `"C136"`), exactamente 2 hembras con `sireNaab: null`, y un mismo `sireNaab` aparece en 41 hembras

#### Scenario: Toros para la demo de consanguinidad
- **WHEN** se lee `bulls.seed.json`
- **THEN** existen `029HO19531` y al menos 2 toros con `sireNaab: '029HO19531'`, todos los lecheros tienen `profile.scale: 'CDCB'` y los 3 de carne tienen `profile: null`, `semenTypes: ['BEEF']` y `calvingEase` no nulo

### Requirement: REQ-SC-06 Los stubs de los núcleos tienen la firma final
`@org/genetics-core` y `@org/matching-core` SHALL exportar todas las funciones de la sección *Contratos* con la firma final y una implementación ingenua documentada como stub. Reemplazar el cuerpo de un stub SHALL no cambiar la firma.

#### Scenario: El stub responde algo usable
- **WHEN** se llama `scoreCandidates(female, classification, bulls, goal, farm, stats)` con el stub
- **THEN** devuelve un `MatchBoard` con `ranked` ordenado, `compatibility` del #1 = 100, `rank` de 1 a n y `excluded: []`

#### Scenario: El stub del núcleo genérico delega en el vertical
- **WHEN** se llama `matchNeed(need, caps, provs, [GeneticsVertical])` con `need.category: 'GENETICS'` con el stub
- **THEN** cada candidato de `ranked` tiene `verticalFacts` definido y `fit.vertical` entre 0 y 1

### Requirement: REQ-SC-07 Los fakes implementan los puertos y son determinísticos
`testing/fakes.ts` SHALL exportar una implementación de cada puerto de `ports.ts` y de `NeedIntakePort` y `LlmClient` que no hace red, no lee la clave de API y devuelve siempre lo mismo para la misma entrada.

#### Scenario: Fake del explicador
- **WHEN** se llama `FakeExplainer.explain(facts)`
- **THEN** devuelve `{ text: facts.reasons.join(' '), source: 'FALLBACK' }` sin llamar a ningún LLM

#### Scenario: Fake del intake con texto conocido
- **WHEN** se llama `FakeNeedIntake.parse("necesito quien me are 40 ha en Río Cuarto la semana que viene", 'farm-a')`
- **THEN** devuelve la versión estructurada de `needs.samples.json` con `category: 'MACHINERY'`, `magnitude: { value: 40, unit: 'HA' }` y `status: 'DRAFT'`

### Requirement: REQ-SC-08 Los contratos se congelan
Al cerrar esta capacidad el repo SHALL llevar el tag `contracts-v1`. Después del tag, un cambio a `shared-types` o a las firmas de los núcleos SHALL ser aditivo (campo opcional, tipo nuevo, ruta nueva); renombrar o borrar SHALL requerir acuerdo explícito de los cuatro devs.

#### Scenario: Cambio aditivo permitido
- **WHEN** un dev agrega `Need.audioUrl?: string` después del tag
- **THEN** ningún consumidor existente deja de compilar y el cambio se acepta en un PR chico

#### Scenario: Cambio incompatible
- **WHEN** un dev quiere renombrar `Classification.corrective` a `Classification.correctiveTraits`
- **THEN** no se hace en su rama: se para, se avisa a los cuatro y se decide en conjunto
