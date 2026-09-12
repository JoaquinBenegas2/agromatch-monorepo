import { z } from 'zod';

/**
 * Fuente única de verdad de los contratos (REQ-SC-01). Los tipos de
 * `domain.ts` / `marketplace.ts` / `ports.ts` / `api.ts` se derivan de estos
 * esquemas con `z.infer`; no se redefinen a mano en ningún otro lado.
 */

// ---------------------------------------------------------------------------
// domain.ts
// ---------------------------------------------------------------------------

export const ScaleSchema = z.literal('CDCB');

export const TraitKeySchema = z.enum([
  'ci',
  'milk',
  'fat',
  'pro',
  'pl',
  'scs',
  'fs',
  'rfi',
]);

export const TraitVectorSchema = z.object({
  ci: z.number(),
  milk: z.number(),
  fat: z.number(),
  pro: z.number(),
  pl: z.number(),
  scs: z.number(),
  fs: z.number(),
  rfi: z.number(),
});

export const BetaCaseinSchema = z.enum(['A1/A1', 'A1/A2', 'A2/A2']);
export const KappaCaseinSchema = z.enum(['AA', 'AB', 'BB', 'AE', 'BE', 'EE']);

// RN-01: todo valor genético SHALL declarar escala CDCB.
export const GenomicProfileSchema = z.object({
  traits: TraitVectorSchema,
  betaCasein: BetaCaseinSchema.nullable(),
  kappaCasein: KappaCaseinSchema.nullable(),
  scale: ScaleSchema,
  source: z.string(),
});

export const FemaleCategorySchema = z.enum(['CALF', 'HEIFER', 'COW']);

export const FemaleSchema = z.object({
  id: z.string(),
  farmId: z.string(),
  visualId: z.string(),
  birthDate: z.string(),
  sireNaab: z.string().nullable(),
  category: FemaleCategorySchema,
  profile: GenomicProfileSchema.nullable(),
});

export const SemenTypeSchema = z.enum(['SEXED', 'CONVENTIONAL', 'BEEF']);
export const BreedSchema = z.enum(['HO', 'JE', 'AN', 'HE', 'LM']);

// RN-22: naab es la clave única global de un toro.
export const BullSchema = z.object({
  naab: z.string(),
  name: z.string(),
  company: z.string(),
  breed: BreedSchema,
  profile: GenomicProfileSchema.nullable(),
  sireNaab: z.string().nullable(),
  calvingEase: z.number().nullable(),
  semenTypes: z.array(SemenTypeSchema),
  pricePerDose: z.number().nullable(),
  source: z.string(),
});

export const TierQuotasSchema = z.object({
  sexedPct: z.number(),
  beefPct: z.number(),
});

export const GrayZoneSchema = z.object({
  from: z.number(),
  to: z.number(),
});

// ADR-0001: scsGrayZone / plGrayZone aditivos, configurables por tambo.
export const FarmSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  tierQuotas: TierQuotasSchema,
  calvingEaseMaxHeifer: z.number(),
  scsGrayZone: GrayZoneSchema,
  plGrayZone: GrayZoneSchema,
});

export const GoalPresetSchema = z.enum([
  'BALANCED',
  'SOLIDS_CHEESE',
  'A2_MILK',
  'VOLUME',
  'HEALTH_LONGEVITY',
  'EFFICIENCY',
]);

export const BreedingGoalSchema = z.object({
  preset: z.union([GoalPresetSchema, z.literal('CUSTOM')]),
  weights: TraitVectorSchema.partial(),
  wantBetaA2: z.boolean(),
  wantKappaBB: z.boolean(),
  rawText: z.string().optional(),
});

export const TierSchema = z.enum(['ELITE', 'COMMERCIAL', 'BEEF', 'CULL_ALERT']);

export const TagSchema = z.enum([
  'A2_NUCLEUS',
  'CHEESE_BB',
  'MASTITIS_RISK',
  'SHORT_LIFE',
  'NO_SIRE',
  'GOAL_PROTECTED',
]);

export const ClassificationSchema = z.object({
  femaleId: z.string(),
  tier: TierSchema,
  semenType: SemenTypeSchema.nullable(),
  ciPercentile: z.number(),
  tags: z.array(TagSchema),
  corrective: z.array(TraitKeySchema),
  // Texto determinístico, nunca de la IA.
  reasons: z.array(z.string()),
});

export const RuleIdSchema = z.enum(['RN-05', 'RN-06', 'RN-13', 'RN-31']);

export const FilterResultSchema = z.object({
  rule: RuleIdSchema,
  passed: z.boolean(),
  detail: z.string(),
});

export const CaseinOddsSchema = z.object({
  betaA2A2: z.number().nullable(),
  kappaBB: z.number().nullable(),
});

export const ExplanationFactsSchema = z.object({
  femaleVisualId: z.string(),
  femaleCategory: FemaleCategorySchema,
  tier: TierSchema,
  corrective: z.array(TraitKeySchema),
  goal: BreedingGoalSchema,
  bull: z.object({
    naab: z.string(),
    name: z.string(),
    company: z.string(),
    breed: BreedSchema,
  }),
  semenType: SemenTypeSchema,
  damTraits: TraitVectorSchema.nullable(),
  expectedProgeny: TraitVectorSchema.nullable(),
  deltaVsDam: TraitVectorSchema.partial().nullable(),
  caseinOdds: CaseinOddsSchema,
  compatibility: z.number(),
  rank: z.number(),
  totalCandidates: z.number(),
  reasons: z.array(z.string()),
  // Resultado de los filtros RN-05/RN-06/RN-13 del par; matchNeed los copia a
  // MatchCandidate.filters.
  filters: z.array(FilterResultSchema).optional(),
});

export const ExplanationSchema = z.object({
  text: z.string(),
  source: z.enum(['AI', 'FALLBACK']),
});

export const PlanItemSchema = z.object({
  femaleId: z.string(),
  bullNaab: z.string(),
  semenType: SemenTypeSchema,
  compatibility: z.number(),
  pricePerDose: z.number().nullable(),
});

export const BreedingPlanSchema = z.object({
  id: z.string(),
  farmId: z.string(),
  createdAt: z.string(),
  items: z.array(PlanItemSchema),
  totals: z.object({
    doses: z.record(SemenTypeSchema, z.number()),
    // Ignora pricePerDose null.
    cost: z.number(),
    avgExpectedProgeny: TraitVectorSchema.partial(),
  }),
});

export const RoleSchema = z.enum(['FARMER', 'ADVISOR', 'ADMIN']);

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: RoleSchema,
  farmIds: z.array(z.string()),
});

export const TraitStatsSchema = z.object({
  mean: TraitVectorSchema,
  std: TraitVectorSchema,
});

// ---------------------------------------------------------------------------
// marketplace.ts
// ---------------------------------------------------------------------------

export const NeedCategorySchema = z.enum([
  'MACHINERY',
  'VET',
  'INPUTS',
  'ADVISORY',
  'SOFTWARE',
  'FINANCE',
  'GENETICS',
  'OTHER',
]);

export const GeoPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string(),
});

export const TimeWindowSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const UnitSchema = z.enum(['HA', 'HEAD', 'TON', 'UNIT', 'VISIT']);

export const MagnitudeSchema = z.object({
  value: z.number(),
  unit: UnitSchema,
});

export const NeedStatusSchema = z.enum(['DRAFT', 'OPEN', 'MATCHED', 'CLOSED']);

export const NeedSchema = z.object({
  id: z.string(),
  farmId: z.string(),
  // RN-39: siempre se guarda.
  rawText: z.string(),
  category: NeedCategorySchema,
  what: z.string(),
  // Puede faltar solo mientras la necesidad está en DRAFT (RN-30).
  where: GeoPointSchema.optional(),
  radiusKm: z.number().optional(),
  // Puede faltar solo mientras la necesidad está en DRAFT (RN-30).
  window: TimeWindowSchema.optional(),
  magnitude: MagnitudeSchema.optional(),
  constraints: z.array(z.string()),
  budget: z.number().optional(),
  status: NeedStatusSchema,
  // Solo en GENETICS.
  goal: BreedingGoalSchema.optional(),
  createdAt: z.string(),
  // Campos que el intake no pudo completar; presentes solo en DRAFT (M4).
  missingFields: z.array(z.string()).optional(),
  // Confianza 0..1 por campo interpretado (M4).
  confidence: z.record(z.string(), z.number()).optional(),
  // true = Need sintética que arma el swipe (ADR-0002). Nunca sale por GET /needs.
  synthetic: z.boolean().optional(),
});

export const PriceModelSchema = z.enum([
  'PER_HA',
  'PER_HEAD',
  'PER_VISIT',
  'PER_UNIT',
  'MONTHLY',
  'QUOTE',
]);

export const ProviderTypeSchema = z.enum([
  'CONTRACTOR',
  'VET',
  'DISTRIBUTOR',
  'SEMEN_COMPANY',
  'ADVISOR',
  'OTHER',
]);

export const ProviderContactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ProviderTypeSchema,
  base: GeoPointSchema,
  // RN-37: false = cargado de fuente pública.
  verified: z.boolean(),
  reputation: z.object({
    avg: z.number().nullable(),
    jobs: z.number(),
  }),
  // RN-36: solo se expone dentro de ServiceRequest.
  contact: ProviderContactSchema,
  source: z.string(),
});

export const CapabilitySchema = z.object({
  id: z.string(),
  // En GENETICS: id = bull.naab (ADR-0002).
  providerId: z.string(),
  category: NeedCategorySchema,
  serviceType: z.string(),
  coverageRadiusKm: z.number(),
  capacityPerDay: MagnitudeSchema.optional(),
  availability: z.array(TimeWindowSchema),
  priceModel: PriceModelSchema,
  priceFrom: z.number().optional(),
  certifications: z.array(z.string()),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const FitBreakdownSchema = z.object({
  proximity: z.number(),
  availability: z.number(),
  capacity: z.number(),
  price: z.number(),
  reputation: z.number(),
  vertical: z.number().optional(),
});

export const MatchCandidateSchema = z.object({
  needId: z.string(),
  capabilityId: z.string(),
  providerId: z.string(),
  // RN-32, RN-33.
  score: z.number(),
  compatibility: z.number(),
  rank: z.number(),
  fit: FitBreakdownSchema,
  // RN-31.
  filters: z.array(FilterResultSchema),
  // ExplanationFacts en GENETICS (RN-35).
  verticalFacts: z.unknown().optional(),
  reasons: z.array(z.string()),
  explanation: ExplanationSchema.optional(),
});

export const MatchBoardSchema = z.object({
  ranked: z.array(MatchCandidateSchema),
  excluded: z.array(MatchCandidateSchema),
});

export const ServiceRequestStatusSchema = z.enum([
  'SENT',
  'ANSWERED',
  'ACCEPTED',
  'DONE',
  'CANCELLED',
]);

export const ServiceRequestSchema = z.object({
  id: z.string(),
  needId: z.string(),
  providerId: z.string(),
  message: z.string(),
  status: ServiceRequestStatusSchema,
  createdAt: z.string(),
  // RN-36: acá y solo acá.
  contact: ProviderContactSchema,
});

export const ReviewSchema = z.object({
  id: z.string(),
  serviceRequestId: z.string(),
  providerId: z.string(),
  rating: z.number(),
  comment: z.string(),
  createdAt: z.string(),
});

// ---------------------------------------------------------------------------
// ports.ts
// ---------------------------------------------------------------------------

export const FemaleFieldSchema = z.union([
  z.enum(['visualId', 'birthDate', 'sireNaab']),
  TraitKeySchema,
  z.enum(['betaCasein', 'kappaCasein']),
]);

export const ColumnMappingSchema = z.object({
  headerRow: z.number(),
  columns: z.record(z.string(), z.union([FemaleFieldSchema, z.literal('IGNORE')])),
});

export const MappingProposalSchema = ColumnMappingSchema.extend({
  // 0..1 por columna.
  confidence: z.record(z.string(), z.number()),
  warnings: z.array(z.string()),
});

export const RowRejectionSchema = z.object({
  row: z.number(),
  reason: z.string(),
});

export const HerdImportResultSchema = z.object({
  females: z.array(FemaleSchema),
  rowsOk: z.number(),
  rowsRejected: z.array(RowRejectionSchema),
  warnings: z.array(z.string()),
});

export const CatalogImportResultSchema = z.object({
  bulls: z.array(BullSchema),
  rowsRejected: z.array(RowRejectionSchema),
  warnings: z.array(z.string()),
});

export const ChatAnswerSchema = z.object({
  text: z.string(),
  usedTools: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// api.ts — cuerpos y respuestas de rutas, formato único de error
// ---------------------------------------------------------------------------

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()),
});

export const ClassificationSummarySchema = z.object({
  byTier: z.record(TierSchema, z.number()),
  byTag: z.record(TagSchema, z.number()),
  // Hembras con perfil.
  total: z.number(),
  // RN-24.
  withoutProfile: z.number(),
  // "47% vs 30%": cuántas irían a BEEF con las reglas clásicas.
  classicRulesBeefCount: z.number(),
});

export const FarmSummarySchema = z.object({
  farm: FarmSchema,
  total: z.number(),
  byTier: z.record(TierSchema, z.number()),
  avgTraits: TraitVectorSchema.partial(),
  a2a2Share: z.number(),
  bbShare: z.number(),
});

export const FemaleWithClassificationSchema = FemaleSchema.extend({
  classification: ClassificationSchema.nullable(),
});

export const MeResponseSchema = z.object({
  user: UserSchema,
  farms: z.array(FarmSchema),
});

export const CreateNeedBodySchema = z.object({
  rawText: z.string(),
  farmId: z.string(),
});

export const UpdateNeedBodySchema = NeedSchema.partial().extend({
  confirm: z.literal(true).optional(),
});

export const CreateServiceRequestBodySchema = z.object({
  providerId: z.string(),
  message: z.string(),
});

export const CreateReviewBodySchema = z.object({
  rating: z.number(),
  comment: z.string(),
});

export const GoalBodySchema = z.object({
  goal: BreedingGoalSchema,
});

export const ParseGoalBodySchema = z.object({
  text: z.string(),
});

export const ChatBodySchema = z.object({
  question: z.string(),
});

export const HerdImportConfirmResponseSchema = z.object({
  importId: z.string(),
  proposal: MappingProposalSchema,
});
