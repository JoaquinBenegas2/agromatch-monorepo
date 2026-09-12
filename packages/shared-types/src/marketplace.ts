import type { z } from 'zod';
import {
  CapabilitySchema,
  FitBreakdownSchema,
  GeoPointSchema,
  MagnitudeSchema,
  MatchBoardSchema,
  MatchCandidateSchema,
  NegotiationMessageSchema,
  NegotiationSchema,
  NeedCategorySchema,
  NeedSchema,
  NeedStatusSchema,
  PriceModelSchema,
  ProviderContactSchema,
  ProviderSchema,
  ProviderTypeSchema,
  PublicProviderSchema,
  ReviewSchema,
  ServiceRequestSchema,
  ServiceRequestStatusSchema,
  TimeWindowSchema,
  UnitSchema,
} from './schemas.js';

export type NeedCategory = z.infer<typeof NeedCategorySchema>;
export type GeoPoint = z.infer<typeof GeoPointSchema>;
export type TimeWindow = z.infer<typeof TimeWindowSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type Magnitude = z.infer<typeof MagnitudeSchema>;

export type NeedStatus = z.infer<typeof NeedStatusSchema>;
export type Need = z.infer<typeof NeedSchema>;

export type PriceModel = z.infer<typeof PriceModelSchema>;
export type ProviderType = z.infer<typeof ProviderTypeSchema>;
export type ProviderContact = z.infer<typeof ProviderContactSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type PublicProvider = z.infer<typeof PublicProviderSchema>;
export type Capability = z.infer<typeof CapabilitySchema>;

export type FitBreakdown = z.infer<typeof FitBreakdownSchema>;
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;
export type MatchBoard = z.infer<typeof MatchBoardSchema>;

export type ServiceRequestStatus = z.infer<typeof ServiceRequestStatusSchema>;
export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;
export type NegotiationMessage = z.infer<typeof NegotiationMessageSchema>;
export type Negotiation = z.infer<typeof NegotiationSchema>;
export type Review = z.infer<typeof ReviewSchema>;

/** Un vertical se registra; el núcleo no lo conoce (RN-35, ADR-0002). */
export interface VerticalEngine<TFacts = unknown> {
  category: NeedCategory;
  canHandle(need: Need): boolean;
  /** Una llamada por candidato. Devuelve el score CRUDO; matchNeed reescala 0..100. */
  score(
    need: Need,
    candidate: MatchCandidate,
    ctx: unknown,
  ): { score: number; facts: TFacts; reasons: string[] };
}

/** Puerto de intake (RN-30). */
export interface NeedIntakePort {
  parse(rawText: string, farmId: string): Promise<Need>;
}
