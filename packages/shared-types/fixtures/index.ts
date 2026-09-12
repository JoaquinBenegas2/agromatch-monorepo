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
import bullsSeedJson from './bulls.seed.json' with { type: 'json' };
import providersJson from './providers.json' with { type: 'json' };
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

export const farms = farmsJson as unknown as Farm[];
export const users = usersJson as unknown as User[];
export const bullsSeed = bullsSeedJson as unknown as Bull[];
export const providers = providersJson.providers as unknown as Provider[];
export const capabilities = providersJson.capabilities as unknown as Capability[];

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
  classificationSummary: classificationSummaryJson as unknown as ClassificationSummary,
  matchBoardGenetics: matchBoardGeneticsJson as unknown as MatchBoard,
  matchBoardMachinery: matchBoardMachineryJson as unknown as MatchBoard,
  explanation: explanationJson as unknown as Explanation,
  explanationFacts: explanationFactsJson as unknown as ExplanationFacts,
  breedingPlan: breedingPlanJson as unknown as BreedingPlan,
  farmSummaries: farmSummariesJson as unknown as FarmSummary[],
  needDraft: needDraftJson as unknown as Need,
  chatAnswer: chatAnswerJson as unknown as ChatAnswer,
};
