import type { z } from 'zod';
import type { ZodType } from 'zod';
import type {
  BreedingGoal,
  Explanation,
  ExplanationFacts,
  Female,
  Tag,
  Tier,
} from './domain.js';
import {
  CatalogImportResultSchema,
  ChatAnswerSchema,
  ColumnMappingSchema,
  FemaleFieldSchema,
  HerdImportResultSchema,
  MappingProposalSchema,
  RowRejectionSchema,
} from './schemas.js';

export type FemaleField = z.infer<typeof FemaleFieldSchema>;
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;
export type MappingProposal = z.infer<typeof MappingProposalSchema>;
export type RowRejection = z.infer<typeof RowRejectionSchema>;
export type HerdImportResult = z.infer<typeof HerdImportResultSchema>;
export type CatalogImportResult = z.infer<typeof CatalogImportResultSchema>;

export interface HerdIngestionPort {
  proposeMapping(file: Uint8Array, filename: string): Promise<MappingProposal>;
  applyMapping(
    file: Uint8Array,
    mapping: ColumnMapping,
    farmId: string,
  ): Promise<HerdImportResult>;
}

/** Fuera del MVP (C3); el contrato se deja. */
export interface CatalogIngestionPort {
  extract(file: Uint8Array, filename: string): Promise<CatalogImportResult>;
}

export interface ExplainerPort {
  explain(facts: ExplanationFacts): Promise<Explanation>;
}

export interface GoalParserPort {
  parse(text: string): Promise<BreedingGoal>;
}

/** Herramientas que el chat puede invocar (las implementa la API, las usa la IA). */
export interface HerdQueryTools {
  countByTier(farmId: string): Promise<Record<Tier, number>>;
  listFemales(
    farmId: string,
    filter: { tier?: Tier; tag?: Tag; limit?: number },
  ): Promise<Female[]>;
  explainClassification(farmId: string, femaleId: string): Promise<string[]>;
}

export type ChatAnswer = z.infer<typeof ChatAnswerSchema>;

export interface ChatPort {
  ask(farmId: string, question: string, tools: HerdQueryTools): Promise<ChatAnswer>;
}

/** El único punto de contacto con el LLM (D5). Lo implementa `llm-client`. */
export interface LlmClient {
  completeJson<T>(prompt: LlmPrompt, schema: ZodType<T>): Promise<T>;
  completeText(prompt: LlmPrompt): Promise<string>;
}

export interface LlmPrompt {
  /** Parte fija: va con cache_control. */
  system: string;
  /** Parte variable. */
  user: string;
  maxTokens?: number;
}

