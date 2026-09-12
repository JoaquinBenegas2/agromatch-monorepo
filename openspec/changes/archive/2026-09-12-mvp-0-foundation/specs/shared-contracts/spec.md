# shared-contracts — Los contratos, fixtures, fakes y stubs de todos

**Dueño:** la semilla (una sola persona escribe, los otros tres revisan cada archivo en vivo). ~40 min.
**Prioridad:** P0. Bloquea todo.

## Purpose

Define los tipos, esquemas y sustitutos que los cuatro devs importan desde el minuto 0 para trabajar en paralelo sin depender del código de otro: `@org/shared-types` (dominio, marketplace, puertos, rutas, zod, fixtures, fakes) y las firmas con stub de `@org/matching-core` y `@org/genetics-core`. Se congelan con el tag `contracts-v1`.

## Alcance

**Entra**
- `packages/shared-types/src/domain.ts`, `marketplace.ts`, `ports.ts`, `api.ts`, `schemas.ts` (zod) con el contenido exacto de la sección *Contratos*.
- `packages/shared-types/fixtures/*` y `packages/shared-types/testing/fakes.ts`.
- Generación con Nx de `packages/matching-core`, `packages/genetics-core` y `packages/ai`, importables desde `apps/backend`.
- Stubs con firma final e implementación ingenua en los dos núcleos.
- Script `scripts/excel-to-fixture.ts` ya usado para producir `fixtures/herd-farm-a.json`; el fixture se mueve a `packages/shared-types/fixtures/`.

**Queda afuera**
- Cualquier lógica real de los núcleos (`mvp-a-core`, `mvp-c-herd`).
- Los adaptadores reales de IA (`mvp-c-herd`, `mvp-d-match`, `mvp-b-need`).
- El catálogo real de toros (A6) y los proveedores reales (M7): acá van semillas marcadas como tales.
- `visibility`/`ownerFarmId` en `Bull` (ADR-0003, post-hackathon).

## Contratos

Todo lo que sigue es **la firma exacta**. Después de `contracts-v1` solo se admiten cambios aditivos (campo opcional nuevo, tipo nuevo, ruta nueva). Renombrar o borrar frena a los cuatro.

### `packages/shared-types/src/domain.ts`

```ts
export type Scale = 'CDCB';
export type TraitKey = 'ci' | 'milk' | 'fat' | 'pro' | 'pl' | 'scs' | 'fs' | 'rfi';
export type TraitVector = Record<TraitKey, number>;
/** RN-03: +1 más es mejor, -1 menos es mejor */
export const TRAIT_DIRECTION: Record<TraitKey, 1 | -1> = {
  ci: 1, milk: 1, fat: 1, pro: 1, pl: 1, scs: -1, fs: 1, rfi: -1,
};

export type BetaCasein = 'A1/A1' | 'A1/A2' | 'A2/A2';
export type KappaCasein = 'AA' | 'AB' | 'BB' | 'AE' | 'BE' | 'EE';

export interface GenomicProfile {
  traits: TraitVector;
  betaCasein: BetaCasein | null;
  kappaCasein: KappaCasein | null;
  scale: Scale;
  source: string;                 // "Genotipado 2025", "Catálogo ABS AR 2026"...
}

export type FemaleCategory = 'CALF' | 'HEIFER' | 'COW';
export interface Female {
  id: string;
  farmId: string;
  visualId: string;               // TEXTO: hay caravanas como "C136"
  birthDate: string;              // ISO yyyy-mm-dd
  sireNaab: string | null;
  category: FemaleCategory;
  profile: GenomicProfile | null; // null = sin genotipado (RN-24)
}

export type SemenType = 'SEXED' | 'CONVENTIONAL' | 'BEEF';
export type Breed = 'HO' | 'JE' | 'AN' | 'HE' | 'LM'; // Holando, Jersey, Angus, Hereford, Limousin
export interface Bull {
  naab: string;                   // ID único global (RN-22)
  name: string;
  company: string;                // NO influye en el score (RN-34)
  breed: Breed;
  profile: GenomicProfile | null; // null en toros de carne
  sireNaab: string | null;
  calvingEase: number | null;     // % de partos difíciles; menos es mejor
  semenTypes: SemenType[];
  pricePerDose: number | null;    // USD
  source: string;
}

export interface TierQuotas { sexedPct: number; beefPct: number } // default 25 / 30
export interface GrayZone { from: number; to: number }             // ADR-0001, inclusivo
export interface Farm {
  id: string;
  name: string;
  location: string;
  tierQuotas: TierQuotas;
  calvingEaseMaxHeifer: number;   // default 2.5 (D3)
  scsGrayZone: GrayZone;          // default { from: 3.10, to: 3.18 } (ADR-0001)
  plGrayZone: GrayZone;           // default { from: 0.00, to: 0.20 } (ADR-0001)
}

export type GoalPreset =
  | 'BALANCED' | 'SOLIDS_CHEESE' | 'A2_MILK' | 'VOLUME' | 'HEALTH_LONGEVITY' | 'EFFICIENCY';
export interface BreedingGoal {
  preset: GoalPreset | 'CUSTOM';
  weights: Partial<Record<TraitKey, number>>; // suman 1
  wantBetaA2: boolean;
  wantKappaBB: boolean;
  rawText?: string;                           // texto libre que interpretó la IA (RN-20)
}

export type Tier = 'ELITE' | 'COMMERCIAL' | 'BEEF' | 'CULL_ALERT';
export type Tag =
  | 'A2_NUCLEUS' | 'CHEESE_BB' | 'MASTITIS_RISK' | 'SHORT_LIFE' | 'NO_SIRE' | 'GOAL_PROTECTED';
export interface Classification {
  femaleId: string;
  tier: Tier;
  semenType: SemenType | null;    // null en CULL_ALERT
  ciPercentile: number;           // 0..100 dentro del tambo (RN-07)
  tags: Tag[];
  corrective: TraitKey[];         // rasgos a corregir en el matching (RN-09)
  reasons: string[];              // texto determinístico, nunca de la IA
}

export type RuleId = 'RN-05' | 'RN-06' | 'RN-13' | 'RN-31';
export interface FilterResult { rule: RuleId; passed: boolean; detail: string }
export interface CaseinOdds { betaA2A2: number | null; kappaBB: number | null } // 0..1

// MatchResult / MatchSet NO EXISTEN (ADR-0002). El vertical usa MatchCandidate /
// MatchBoard de marketplace.ts; lo genético viaja en MatchCandidate.verticalFacts.

export interface ExplanationFacts {
  femaleVisualId: string;
  femaleCategory: FemaleCategory;
  tier: Tier;
  corrective: TraitKey[];
  goal: BreedingGoal;
  bull: { naab: string; name: string; company: string; breed: Breed };
  semenType: SemenType;
  damTraits: TraitVector | null;
  expectedProgeny: TraitVector | null;
  deltaVsDam: Partial<TraitVector> | null;
  caseinOdds: CaseinOdds;
  compatibility: number;
  rank: number;
  totalCandidates: number;
  reasons: string[];
  /** Resultado de los filtros RN-05/RN-06/RN-13 del par; matchNeed los copia a MatchCandidate.filters. */
  filters?: FilterResult[];
}
export interface Explanation { text: string; source: 'AI' | 'FALLBACK' }

export interface PlanItem {
  femaleId: string;
  bullNaab: string;
  semenType: SemenType;
  compatibility: number;
  pricePerDose: number | null;
}
export interface BreedingPlan {
  id: string;
  farmId: string;
  createdAt: string;
  items: PlanItem[];
  totals: {
    doses: Record<SemenType, number>;
    cost: number;                              // ignora pricePerDose null
    avgExpectedProgeny: Partial<TraitVector>;
  };
}

export type Role = 'FARMER' | 'ADVISOR' | 'ADMIN';
export interface User { id: string; name: string; role: Role; farmIds: string[] }

export interface TraitStats { mean: TraitVector; std: TraitVector }
```

### `packages/shared-types/src/marketplace.ts`

```ts
export type NeedCategory =
  | 'MACHINERY' | 'VET' | 'INPUTS' | 'ADVISORY' | 'SOFTWARE' | 'FINANCE' | 'GENETICS' | 'OTHER';

export interface GeoPoint { lat: number; lng: number; label: string }
export interface TimeWindow { from: string; to: string }            // ISO
export type Unit = 'HA' | 'HEAD' | 'TON' | 'UNIT' | 'VISIT';
export interface Magnitude { value: number; unit: Unit }

export type NeedStatus = 'DRAFT' | 'OPEN' | 'MATCHED' | 'CLOSED';
export interface Need {
  id: string;
  farmId: string;
  rawText: string;                       // siempre se guarda (RN-39)
  category: NeedCategory;
  what: string;                          // "arar", "control reproductivo", "urea"
  where: GeoPoint;
  radiusKm?: number;                     // modelo de dominio §5
  window: TimeWindow;
  magnitude?: Magnitude;
  constraints: string[];                 // "con GPS", "matriculado", "factura A"
  budget?: number;
  status: NeedStatus;
  goal?: BreedingGoal;                   // solo en GENETICS
  createdAt: string;                     // ISO (modelo de dominio §5)
  /** Campos que el intake no pudo completar; presentes solo en DRAFT (M4). */
  missingFields?: Array<keyof Need>;
  /** Confianza 0..1 por campo interpretado (M4). */
  confidence?: Partial<Record<keyof Need, number>>;
  /** true = Need sintética que arma el swipe (ADR-0002). Nunca sale por GET /needs. */
  synthetic?: boolean;
}

export type PriceModel = 'PER_HA' | 'PER_HEAD' | 'PER_VISIT' | 'PER_UNIT' | 'MONTHLY' | 'QUOTE';
export type ProviderType = 'CONTRACTOR' | 'VET' | 'DISTRIBUTOR' | 'SEMEN_COMPANY' | 'ADVISOR' | 'OTHER';
export interface Provider {
  id: string; name: string; type: ProviderType;
  base: GeoPoint;
  verified: boolean;                     // RN-37: false = cargado de fuente pública
  reputation: { avg: number | null; jobs: number };
  contact: { phone?: string; email?: string }; // solo se expone dentro de ServiceRequest (RN-36)
  source: string;
}
export interface Capability {
  id: string; providerId: string;        // en GENETICS: id = bull.naab (ADR-0002)
  category: NeedCategory;
  serviceType: string;                   // "arada", "cosecha", "reproducción", "semen"
  coverageRadiusKm: number;
  capacityPerDay?: Magnitude;
  availability: TimeWindow[];
  priceModel: PriceModel;
  priceFrom?: number;
  certifications: string[];
  attributes: Record<string, string | number | boolean>;
}

export interface FitBreakdown {
  proximity: number; availability: number; capacity: number;
  price: number; reputation: number; vertical?: number;   // 0..1 cada uno
}
export interface MatchCandidate {
  needId: string; capabilityId: string; providerId: string;
  score: number; compatibility: number; rank: number;     // RN-32, RN-33
  fit: FitBreakdown;
  filters: FilterResult[];                                // RN-31
  verticalFacts?: unknown;                                // ExplanationFacts en GENETICS (RN-35)
  reasons: string[];
  explanation?: Explanation;
}
export interface MatchBoard { ranked: MatchCandidate[]; excluded: MatchCandidate[] }

export type ServiceRequestStatus = 'SENT' | 'ANSWERED' | 'ACCEPTED' | 'DONE' | 'CANCELLED';
export interface ServiceRequest {
  id: string; needId: string; providerId: string;
  message: string;
  status: ServiceRequestStatus;
  createdAt: string;
  contact: Provider['contact'];          // RN-36: acá y solo acá
}
export interface Review {
  id: string; serviceRequestId: string; providerId: string;
  rating: number; comment: string;
  createdAt: string;                     // modelo de dominio §5
}

/** Un vertical se registra; el núcleo no lo conoce (RN-35, ADR-0002). */
export interface VerticalEngine<TFacts = unknown> {
  category: NeedCategory;
  canHandle(need: Need): boolean;
  /** Una llamada por candidato. Devuelve el score CRUDO; matchNeed reescala 0..100. */
  score(need: Need, candidate: MatchCandidate, ctx: unknown):
    { score: number; facts: TFacts; reasons: string[] };
}

/** Puerto de intake (RN-30). */
export interface NeedIntakePort { parse(rawText: string, farmId: string): Promise<Need> }
```

### `packages/shared-types/src/ports.ts`

```ts
export type FemaleField =
  | 'visualId' | 'birthDate' | 'sireNaab' | TraitKey | 'betaCasein' | 'kappaCasein';
export interface ColumnMapping { headerRow: number; columns: Record<string, FemaleField | 'IGNORE'> }
export interface MappingProposal extends ColumnMapping {
  confidence: Record<string, number>; // 0..1 por columna
  warnings: string[];
}
export interface RowRejection { row: number; reason: string }
export interface HerdImportResult {
  females: Female[];
  rowsOk: number;
  rowsRejected: RowRejection[];
  warnings: string[];
}
export interface CatalogImportResult { bulls: Bull[]; rowsRejected: RowRejection[]; warnings: string[] }

export interface HerdIngestionPort {
  proposeMapping(file: Uint8Array, filename: string): Promise<MappingProposal>;
  applyMapping(file: Uint8Array, mapping: ColumnMapping, farmId: string): Promise<HerdImportResult>;
}
export interface CatalogIngestionPort {           // fuera del MVP (C3); el contrato se deja
  extract(file: Uint8Array, filename: string): Promise<CatalogImportResult>;
}
export interface ExplainerPort { explain(facts: ExplanationFacts): Promise<Explanation> }
export interface GoalParserPort { parse(text: string): Promise<BreedingGoal> }

/** Herramientas que el chat puede invocar (las implementa la API, las usa la IA). */
export interface HerdQueryTools {
  countByTier(farmId: string): Promise<Record<Tier, number>>;
  listFemales(farmId: string, filter: { tier?: Tier; tag?: Tag; limit?: number }): Promise<Female[]>;
  explainClassification(farmId: string, femaleId: string): Promise<string[]>;
}
export interface ChatAnswer { text: string; usedTools: string[] }
export interface ChatPort { ask(farmId: string, question: string, tools: HerdQueryTools): Promise<ChatAnswer> }

/** El único punto de contacto con el LLM (D5). Lo implementa `llm-client`. */
export interface LlmClient {
  completeJson<T>(prompt: LlmPrompt, schema: ZodType<T>): Promise<T>;
  completeText(prompt: LlmPrompt): Promise<string>;
}
export interface LlmPrompt {
  system: string;          // parte fija: va con cache_control
  user: string;            // parte variable
  maxTokens?: number;
}
```

### `packages/shared-types/src/api.ts` — rutas, prefijo `/api`

Todas las rutas llevan el header `x-user-id`. Un establecimiento que no pertenece al usuario devuelve **403** (RN-38). Los tipos de body y respuesta se exportan como esquemas zod en `schemas.ts` y como tipos inferidos.

| Método y ruta | Body | Respuesta | Spec que la implementa |
|---|---|---|---|
| `GET /me` | — | `{ user: User; farms: Farm[] }` | **esta** (`api-skeleton`) |
| `GET /bulls` | — | `Bull[]` | **esta** (`api-skeleton`) |
| `POST /needs` | `{ rawText: string; farmId: string }` | `Need` (status `DRAFT`) | `mvp-b-need` |
| `PATCH /needs/:id` | `Partial<Need>` + `{ confirm: true }` | `Need` (status `OPEN`) | `mvp-b-need` |
| `GET /needs` | `?farmId=` | `Need[]` (nunca los `Need` sintéticos de genética) | `mvp-b-need` |
| `POST /needs/:id/matches` | — | `MatchBoard` | `mvp-b-need` |
| `GET /providers` | `?category=` | `Provider[]` (sin `contact`) | `mvp-b-need` |
| `POST /needs/:id/requests` | `{ providerId: string; message: string }` | `ServiceRequest` (con `contact`) | `mvp-b-need` |
| `POST /requests/:id/review` | `{ rating: number; comment: string }` | `Review` | `mvp-b-need` |
| `GET /advisor/overview` | — | `FarmSummary[]` | `mvp-b-need` (anexo) |
| `POST /farms/:farmId/herd-imports` | multipart `file` | `{ importId: string; proposal: MappingProposal }` | `mvp-c-herd` |
| `POST /farms/:farmId/herd-imports/:importId/confirm` | `ColumnMapping` | `HerdImportResult` | `mvp-c-herd` |
| `GET /farms/:farmId/females` | — | `Array<Female & { classification: Classification \| null }>` | `mvp-c-herd` |
| `POST /farms/:farmId/classifications` | `{ goal: BreedingGoal }` | `Classification[]` | `mvp-c-herd` |
| `GET /farms/:farmId/classifications/summary` | — | `ClassificationSummary` | `mvp-c-herd` |
| `POST /farms/:farmId/females/:femaleId/matches` | `{ goal: BreedingGoal }` | `MatchBoard` (ADR-0002) | `mvp-d-match` |
| `POST /farms/:farmId/females/:femaleId/matches/:naab/explanation` | `{ goal: BreedingGoal }` | `Explanation` | `mvp-d-match` |
| `POST /farms/:farmId/plan/items` | `PlanItem` | `BreedingPlan` | `mvp-d-match` |
| `DELETE /farms/:farmId/plan/items/:femaleId` | — | `BreedingPlan` | `mvp-d-match` |
| `POST /farms/:farmId/plan/auto` | `{ goal: BreedingGoal }` | `BreedingPlan` | `mvp-d-match` |
| `GET /farms/:farmId/plan` | — | `BreedingPlan` | `mvp-d-match` |
| `GET /farms/:farmId/plan/export.csv` | — | CSV (UTF-8 con BOM) | `mvp-d-match` |
| `POST /goals/parse` | `{ text: string }` | `BreedingGoal` | `mvp-d-match` |
| `POST /farms/:farmId/chat` | `{ question: string }` | `ChatAnswer` | `mvp-a-core` (anexo) |
| `POST /catalog-imports` | multipart `file` | `{ importId: string; result: CatalogImportResult }` | **fuera del MVP** (C3) |
| `POST /catalog-imports/:importId/confirm` | — | `{ added: number; updated: number }` | **fuera del MVP** (C3) |

```ts
export interface ClassificationSummary {
  byTier: Record<Tier, number>;
  byTag: Record<Tag, number>;
  total: number;                 // hembras con perfil
  withoutProfile: number;        // RN-24
  classicRulesBeefCount: number; // "47% vs 30%": cuántas irían a BEEF con las reglas clásicas
}
export interface FarmSummary {
  farm: Farm;
  total: number;
  byTier: Record<Tier, number>;
  avgTraits: Partial<TraitVector>;
  a2a2Share: number;  // 0..1
  bbShare: number;    // 0..1
}
/** Formato único de error de la API (convenciones §5). */
export interface ApiError { code: string; message: string; details: Record<string, unknown> }
```

### `packages/shared-types/src/schemas.ts`

Un esquema zod por cada tipo que viaja entre paquetes: `FemaleSchema`, `BullSchema`, `FarmSchema`, `UserSchema`, `BreedingGoalSchema`, `ClassificationSchema`, `ExplanationFactsSchema`, `ExplanationSchema`, `PlanItemSchema`, `BreedingPlanSchema`, `NeedSchema`, `ProviderSchema`, `CapabilitySchema`, `MatchCandidateSchema`, `MatchBoardSchema`, `ServiceRequestSchema`, `ReviewSchema`, `MappingProposalSchema`, `ColumnMappingSchema`, `HerdImportResultSchema`, `ChatAnswerSchema`, `FarmSummarySchema`, `ClassificationSummarySchema`, `ApiErrorSchema`, y uno por body de la tabla de rutas. **Los tipos de `domain.ts`/`marketplace.ts` se derivan con `z.infer`**: el esquema es la única fuente.

### `packages/genetics-core/src/index.ts` — firmas con stub

```ts
export function deriveCategory(birthDate: string, today: string): FemaleCategory;                 // A1
export function computeTraitStats(profiles: GenomicProfile[]): TraitStats;                          // A1
export function expectedProgeny(dam: TraitVector, sire: TraitVector): TraitVector;                  // A1
export function normalize(value: number, key: TraitKey, stats: TraitStats): number;                 // A1
export function caseinOdds(dam: GenomicProfile, sire: GenomicProfile): CaseinOdds;                  // A2
export function inbreedingFilter(female: Female, bull: Bull): FilterResult;                         // A3
export function calvingEaseFilter(female: Female, bull: Bull, farm: Farm): FilterResult;            // A3
export function classifyHerd(females: Female[], farm: Farm, goal: BreedingGoal): Classification[]; // B2 (mvp-c-herd)
export function classifyHerdClassic(females: Female[]): Classification[];                          // B2: reglas clásicas, solo para el "47% vs 30%"
export function scoreOneCandidate(                                                                  // A4 (ADR-0002)
  female: Female, classification: Classification, bull: Bull,
  goal: BreedingGoal, stats: TraitStats,
): { score: number; facts: ExplanationFacts; reasons: string[] };
export function scoreCandidates(                                                                    // A4, sobre scoreOneCandidate
  female: Female, classification: Classification, bulls: Bull[],
  goal: BreedingGoal, farm: Farm, stats: TraitStats,
): MatchBoard;
export function toExplanationFacts(/* ver mvp-a-core A5 */): ExplanationFacts;                      // A5
export function makeGeneticsNeed(farmId: string, femaleId: string, goal: BreedingGoal): Need;       // B4 (mvp-d-match)
export function buildAutoPlan(
  farm: Farm, females: Female[], classifications: Classification[],
  bulls: Bull[], goal: BreedingGoal, stats: TraitStats,
): BreedingPlan;                                                                                    // B5 (mvp-d-match)
export const GOAL_PRESETS: Record<GoalPreset, BreedingGoal>;                                        // A4
export const GeneticsVertical: VerticalEngine<ExplanationFacts>;                                    // M3
```

Stubs de T0 (implementación ingenua, la firma no cambia después):
- `classifyHerd`: tercios por CI. `classifyHerdClassic`: igual que `classifyHerd`.
- `scoreCandidates`: ordena por CI del toro, `compatibility = 100 − 5·posición`, sin filtros.
- `buildAutoPlan`: primer toro de `ranked` para cada hembra.
- `GeneticsVertical.score`: llama a `scoreOneCandidate`.
- El resto: la fórmula obvia, sin filtros.

### `packages/matching-core/src/index.ts` — firmas con stub

```ts
export function hardFilters(need: Need, cap: Capability, prov: Provider): FilterResult[];                              // M2
export function scoreCandidate(need: Need, cap: Capability, prov: Provider): { score: number; fit: FitBreakdown; reasons: string[] }; // M2
export function matchNeed(need: Need, caps: Capability[], provs: Provider[], verticals: VerticalEngine[], ctx?: unknown): MatchBoard; // M2
export function registerVertical(engine: VerticalEngine): void;                                                        // M2
export function listVerticals(): VerticalEngine[];                                                                    // M2
```

Stub: `hardFilters` devuelve todo `passed: true`; `matchNeed` puntúa por cercanía y reescala; si hay vertical que `canHandle`, llama a `score`.

### Fixtures — `packages/shared-types/fixtures/`

| Archivo | Contenido |
|---|---|
| `herd-farm-a.json` | Los **293 animales reales** (movido desde `fixtures/`), tambo anonimizado, `scale: 'CDCB'`, `source: "Genotipado 2025"` |
| `herd-farm-b.json`, `herd-farm-c.json` | Rodeos **sintéticos** de ~150 animales, semilla fija, `source: "DEMO SINTÉTICO"` |
| `bulls.seed.json` | 12 toros: 8 Holando (incluye `029HO21010`, `029HO19531` y 2 hijos de `029HO19531`) + 1 Jersey + 3 de carne (AN, HE, LM). `source: "SEED PROVISORIO"`. A6 lo reemplaza con el mismo esquema |
| `providers.json` | Proveedores y capacidades semilla de MACHINERY, VET y GENETICS (las centrales de `bulls.seed.json` como `SEMEN_COMPANY`), `verified: false`. M7 los reemplaza |
| `needs.samples.json` | 5 necesidades en texto libre + su versión estructurada |
| `farms.json` | `farm-a`, `farm-b`, `farm-c` con cupos 25/30, `calvingEaseMaxHeifer: 2.5`, zonas grises por defecto |
| `users.json` | `tambero-a` (FARMER, [farm-a]), `tambero-b` (FARMER, [farm-b]), `asesor-1` (ADVISOR, [farm-a, farm-b, farm-c]), `admin` (ADMIN, los 3) |
| `samples/*.json` | Un ejemplo de cada respuesta: `mapping-proposal`, `herd-import-result`, `classifications`, `classification-summary`, `match-board-genetics`, `match-board-machinery`, `explanation`, `explanation-facts`, `breeding-plan`, `farm-summaries`, `need-draft`, `chat-answer`. Los usa MSW |

### Fakes — `packages/shared-types/testing/fakes.ts`

| Fake | Comportamiento |
|---|---|
| `FakeHerdIngestion` | `proposeMapping` devuelve el mapeo exacto de `herd-farm-a` con confianza 1; `applyMapping` devuelve el fixture |
| `FakeCatalogIngestion` | Devuelve `bulls.seed.json` |
| `FakeExplainer` | `{ text: facts.reasons.join(' '), source: 'FALLBACK' }` |
| `FakeGoalParser` | Palabras clave → preset (`sólidos`/`queso` → `SOLIDS_CHEESE`, `A2` → `A2_MILK`, `leche`/`litros` → `VOLUME`, `salud`/`mastitis`/`vida` → `HEALTH_LONGEVITY`, `eficiencia` → `EFFICIENCY`, otro → `BALANCED`) |
| `FakeNeedIntake` | Busca el `rawText` en `needs.samples.json`; si no está, devuelve `DRAFT` con `missingFields` |
| `FakeChat` | Llama a `countByTier` y responde con el conteo; `usedTools: ['countByTier']` |
| `FakeLlmClient` | `completeJson` devuelve el ejemplo de `samples/` que corresponda al esquema; `completeText` devuelve un texto fijo |

## ADDED Requirements

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

## Reglas que respeta

RN-01 (escala única, REQ-SC-04) · RN-22 (NAAB único, `Bull.naab` es la clave) · RN-24 (`profile: null`) · RN-34 (`company` documentado como no influyente) · RN-35 y **ADR-0002** (REQ-SC-02) · RN-36 (`contact` solo en `ServiceRequest`) · RN-37 (`verified: false` en semilla, REQ-SC-05) · RN-39 (`rawText` obligatorio en `Need`) · **ADR-0001** (zonas grises en `Farm`, REQ-SC-03) · ADR-0003 (los toros sin CDCB quedan afuera; `visibility` queda para después).

## Criterios de aceptación

- [ ] `npx nx run-many -t build` y `-t test` en verde con los 3 paquetes nuevos importados desde `apps/backend`.
- [ ] El test de `shared-types` parsea todos los fixtures con sus esquemas zod.
- [ ] `MatchResult`/`MatchSet` no existen en el repo.
- [ ] `farms.json` tiene zonas grises; `NeedSchema` acepta `radiusKm` y exige `createdAt`.
- [ ] Los stubs devuelven `MatchBoard`, `Classification[]` y `BreedingPlan` válidos contra los esquemas.
- [ ] Tag `contracts-v1` creado y avisado a los cuatro.

## Riesgos y supuestos

- **Supuesto:** el Excel real ya se convirtió a `fixtures/herd-farm-a.json` y es válido contra `FemaleSchema`. Si alguna fila no valida (por ejemplo `scs` fuera de rango), se corrige el fixture, no el esquema.
- **Riesgo:** un dev "necesita" renombrar algo a mitad de camino. Mitigación: REQ-SC-08 y el tag.
- **Riesgo:** `bulls.seed.json` con valores poco realistas hace que la demo de 3031 no encuentre un toro con SCS ≤ 2,80. Mitigación: la semilla incluye a propósito al menos 3 toros lecheros con `scs ≤ 2.80` y `semenTypes` con `CONVENTIONAL`.
- **Supuesto:** `HerdQueryTools.countByTier` tipado como `Record<Tier, number>` (el plan decía `Record<string, number>`); es un estrechamiento aditivo-compatible porque nadie lo consumía todavía.

## Preguntas abiertas

| # | Pregunta | Default tomado acá | Quién cierra |
|---|---|---|---|
| Q1 | `Need.missingFields` y `Need.confidence` no están en el modelo de dominio; M4 los necesita ("marca los campos faltantes") | Se agregan como opcionales | Dev B al implementar M4 |
| Q2 | `ClassificationSummary.classicRulesBeefCount` y `classifyHerdClassic` no están en los contratos de T0; el "47% vs 30%" del tablero (D3) los necesita | Se agregan como aditivos | Dev C al implementar B2/D3 |
| Q3 | `RuleId` incluía solo `'RN-05' \| 'RN-06' \| 'RN-13'`; los filtros del núcleo (RN-31) necesitan identificarse | Se agrega `'RN-31'` | Dev A en M2 |
| Q4 | `ProviderType` era `string` en T0.5b | Se cierra a un union con `SEMEN_COMPANY` (ADR-0002 lo nombra) | Semilla |
| Q5 | `Need.synthetic?` y `ExplanationFacts.filters?` no están en ningún documento; los pidieron `mvp-b-need`, `mvp-a-core` y `mvp-d-match` en la revisión cruzada | Se agregan como opcionales antes de congelar | Los cuatro, al leer las specs |
