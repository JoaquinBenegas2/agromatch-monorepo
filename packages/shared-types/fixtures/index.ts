import type {
  Bull,
  BreedingPlan,
  Classification,
  ClassificationSummary,
  Explanation,
  ExplanationFacts,
  Farm,
  FarmSummary,
  Female,
  MatchBoard,
  Need,
  Provider,
  Capability,
  ChatAnswer,
  MappingProposal,
  HerdImportResult,
  User,
} from '../src/index.js';

import farmsJson from './farms.json' with { type: 'json' };
import usersJson from './users.json' with { type: 'json' };
// A6: bulls.json reemplaza bulls.seed.json (mismo esquema, catálogo real citado).
// El nombre `bullsSeed` se mantiene para no romper a quien ya lo importa.
import bullsSeedJson from './bulls.json' with { type: 'json' };
import providersJson from './providers.json' with { type: 'json' };
import { providerImageUrls } from './provider-images.js';
import needsSamplesJson from './needs.samples.json' with { type: 'json' };
import herdFarmAJson from './herd-farm-a.json' with { type: 'json' };
import herdFarmBJson from './herd-farm-b.json' with { type: 'json' };
import herdFarmCJson from './herd-farm-c.json' with { type: 'json' };

import mappingProposalJson from './samples/mapping-proposal.json' with { type: 'json' };
import herdImportResultJson from './samples/herd-import-result.json' with { type: 'json' };
import classificationsJson from './samples/classifications.json' with { type: 'json' };
import classificationSummaryJson from './samples/classification-summary.json' with { type: 'json' };
import matchBoardGeneticsJson from './samples/match-board-genetics.json' with { type: 'json' };
import matchBoardMachineryJson from './samples/match-board-machinery.json' with { type: 'json' };
import explanationJson from './samples/explanation.json' with { type: 'json' };
import explanationFactsJson from './samples/explanation-facts.json' with { type: 'json' };
import breedingPlanJson from './samples/breeding-plan.json' with { type: 'json' };
import farmSummariesJson from './samples/farm-summaries.json' with { type: 'json' };
import needDraftJson from './samples/need-draft.json' with { type: 'json' };
import chatAnswerJson from './samples/chat-answer.json' with { type: 'json' };
import chatToolChoiceJson from './samples/chat-tool-choice.json' with { type: 'json' };

export const farms = farmsJson as unknown as Farm[];
/** Una cuenta proveedora por ficha permite probar y operar ambos lados del chat. */
export const users = [
  ...usersJson,
  ...providersJson.providers.map((provider) => ({
    id: `proveedor-${provider.id.replace(/^prov-/, '')}`,
    name: provider.name,
    role: 'PROVIDER' as const,
    farmIds: [],
    providerId: provider.id,
  })),
] as unknown as User[];
export const bullsSeed = bullsSeedJson as unknown as Bull[];

function getProviderImageUrl(providerId: string): string {
  const imageUrl = providerImageUrls[providerId];
  if (!imageUrl)
    throw new Error(`Missing marketplace image for provider ${providerId}`);
  return imageUrl;
}

export const providers = providersJson.providers.map((provider) => ({
  ...provider,
  imageUrl: getProviderImageUrl(provider.id),
})) as unknown as Provider[];
export const capabilities =
  providersJson.capabilities as unknown as Capability[];

export interface NeedSample {
  rawText: string;
  need: Need;
}
export const needsSamples = needsSamplesJson as unknown as NeedSample[];

export interface HerdFixture {
  _meta: Record<string, unknown>;
  females: Female[];
}
export const herdFarmA = herdFarmAJson as unknown as HerdFixture;
export const herdFarmB = herdFarmBJson as unknown as HerdFixture;
export const herdFarmC = herdFarmCJson as unknown as HerdFixture;

export const samples = {
  mappingProposal: mappingProposalJson as unknown as MappingProposal,
  herdImportResult: herdImportResultJson as unknown as HerdImportResult,
  classifications: classificationsJson as unknown as Classification[],
  classificationSummary:
    classificationSummaryJson as unknown as ClassificationSummary,
  matchBoardGenetics: matchBoardGeneticsJson as unknown as MatchBoard,
  matchBoardMachinery: matchBoardMachineryJson as unknown as MatchBoard,
  explanation: explanationJson as unknown as Explanation,
  explanationFacts: explanationFactsJson as unknown as ExplanationFacts,
  breedingPlan: breedingPlanJson as unknown as BreedingPlan,
  farmSummaries: farmSummariesJson as unknown as FarmSummary[],
  needDraft: needDraftJson as unknown as Need,
  chatAnswer: chatAnswerJson as unknown as ChatAnswer,
  chatToolChoice: chatToolChoiceJson as unknown as {
    tool: 'countByTier' | 'listFemales' | 'explainClassification' | null;
    tier: string | null;
    tag: string | null;
    limit: number | null;
    femaleId: string | null;
  },
};
