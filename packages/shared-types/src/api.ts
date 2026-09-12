import type { z } from 'zod';
import {
  ApiErrorSchema,
  ChatBodySchema,
  ClassificationSummarySchema,
  CreateNeedBodySchema,
  CreateReviewBodySchema,
  CreateServiceRequestBodySchema,
  FarmSummarySchema,
  FemaleWithClassificationSchema,
  GoalBodySchema,
  HerdImportConfirmResponseSchema,
  MeResponseSchema,
  ParseGoalBodySchema,
  SendNegotiationMessageBodySchema,
  UpdateNeedBodySchema,
} from './schemas.js';

/**
 * Rutas, prefijo `/api`. Todas llevan el header `x-user-id`. Un
 * establecimiento que no pertenece al usuario devuelve 403 (RN-38).
 *
 * | Método y ruta                                                         | Body                                    | Respuesta                                     | Spec               |
 * |------------------------------------------------------------------------|------------------------------------------|------------------------------------------------|---------------------|
 * | GET /me                                                                | —                                        | `{ user: User; farms: Farm[] }`                | api-skeleton        |
 * | GET /bulls                                                             | —                                        | `Bull[]`                                       | api-skeleton        |
 * | POST /needs                                                            | `CreateNeedBody`                         | `Need` (DRAFT)                                  | mvp-b-need          |
 * | GET /needs/:id                                                         | —                                        | `Need`                                          | mvp-b-need          |
 * | PATCH /needs/:id                                                       | `UpdateNeedBody`                         | `Need` (OPEN)                                   | mvp-b-need          |
 * | GET /needs?farmId=                                                     | —                                        | `Need[]` (sin sintéticos)                       | mvp-b-need          |
 * | POST /needs/:id/matches                                                | —                                        | `MatchBoard`                                    | mvp-b-need          |
 * | GET /providers?category=                                               | —                                        | `PublicProvider[]` (sin `contact`)              | mvp-b-need          |
 * | POST /needs/:id/requests                                               | `CreateServiceRequestBody`               | `ServiceRequest` (con `contact`)                | mvp-b-need          |
 * | POST /requests/:id/review                                              | `CreateReviewBody`                       | `Review`                                        | mvp-b-need          |
 * | GET /negotiations                                                      | —                                        | `Negotiation[]`                                 | negotiations        |
 * | GET /negotiations/:id                                                  | —                                        | `Negotiation`                                   | negotiations        |
 * | POST /negotiations/:id/messages                                        | `SendNegotiationMessageBody`             | `Negotiation`                                   | negotiations        |
 * | GET /advisor/overview                                                  | —                                        | `FarmSummary[]`                                 | mvp-b-need (anexo)  |
 * | POST /farms/:farmId/herd-imports                                       | multipart `file`                         | `HerdImportConfirmResponse`                     | mvp-c-herd          |
 * | POST /farms/:farmId/herd-imports/:importId/confirm                     | `ColumnMapping`                          | `HerdImportResult`                              | mvp-c-herd          |
 * | GET /farms/:farmId/females                                             | —                                        | `FemaleWithClassification[]`                    | mvp-c-herd          |
 * | POST /farms/:farmId/classifications                                    | `GoalBody`                               | `Classification[]`                              | mvp-c-herd          |
 * | GET /farms/:farmId/classifications/summary                             | —                                        | `ClassificationSummary`                         | mvp-c-herd          |
 * | POST /farms/:farmId/females/:femaleId/matches                          | `GoalBody`                               | `MatchBoard` (ADR-0002)                         | mvp-d-match         |
 * | POST /farms/:farmId/females/:femaleId/matches/:naab/explanation        | `GoalBody`                               | `Explanation`                                   | mvp-d-match         |
 * | POST /farms/:farmId/plan/items                                         | `PlanItem`                               | `BreedingPlan`                                  | mvp-d-match         |
 * | DELETE /farms/:farmId/plan/items/:femaleId                             | —                                        | `BreedingPlan`                                  | mvp-d-match         |
 * | POST /farms/:farmId/plan/auto                                          | `GoalBody`                               | `BreedingPlan`                                  | mvp-d-match         |
 * | GET /farms/:farmId/plan                                                | —                                        | `BreedingPlan`                                  | mvp-d-match         |
 * | GET /farms/:farmId/plan/export.csv                                     | —                                        | CSV (UTF-8 con BOM)                             | mvp-d-match         |
 * | POST /goals/parse                                                      | `ParseGoalBody`                          | `BreedingGoal`                                  | mvp-d-match         |
 * | POST /farms/:farmId/chat                                               | `ChatBody`                               | `ChatAnswer`                                    | mvp-a-core (anexo)  |
 * | POST /catalog-imports                                                  | multipart `file`                         | `{ importId: string; result: CatalogImportResult }` | fuera del MVP (C3) |
 * | POST /catalog-imports/:importId/confirm                                | —                                        | `{ added: number; updated: number }`            | fuera del MVP (C3) |
 */
export const API_PREFIX = '/api';

export type MeResponse = z.infer<typeof MeResponseSchema>;
export type CreateNeedBody = z.infer<typeof CreateNeedBodySchema>;
export type UpdateNeedBody = z.infer<typeof UpdateNeedBodySchema>;
export type CreateServiceRequestBody = z.infer<
  typeof CreateServiceRequestBodySchema
>;
export type CreateReviewBody = z.infer<typeof CreateReviewBodySchema>;
export type GoalBody = z.infer<typeof GoalBodySchema>;
export type ParseGoalBody = z.infer<typeof ParseGoalBodySchema>;
export type ChatBody = z.infer<typeof ChatBodySchema>;
export type SendNegotiationMessageBody = z.infer<
  typeof SendNegotiationMessageBodySchema
>;
export type HerdImportConfirmResponse = z.infer<
  typeof HerdImportConfirmResponseSchema
>;
export type FemaleWithClassification = z.infer<
  typeof FemaleWithClassificationSchema
>;

export type ClassificationSummary = z.infer<typeof ClassificationSummarySchema>;
export type FarmSummary = z.infer<typeof FarmSummarySchema>;

/** Formato único de error de la API (convenciones §5). */
export type ApiError = z.infer<typeof ApiErrorSchema>;

// Los tipos de dominio de la tabla de rutas (Need, MatchBoard, Provider,
// ServiceRequest, Review, Capability, ColumnMapping, HerdImportResult,
// MappingProposal, Classification, User, Farm, BreedingPlan) ya se exportan
// desde domain.ts / marketplace.ts / ports.ts; `index.ts` los re-exporta a todos
// desde un mismo punto de entrada, así que no se repiten acá.
