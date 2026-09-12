/** Claves de React Query, una por recurso (convenciones §3). */
export const queryKeys = {
  me: () => ['me'] as const,
  bulls: () => ['bulls'] as const,
  needs: (farmId: string) => ['needs', farmId] as const,
  needMatches: (needId: string) => ['needs', needId, 'matches'] as const,
  farmFemales: (farmId: string) => ['farms', farmId, 'females'] as const,
  classificationSummary: (farmId: string) => ['farms', farmId, 'classifications', 'summary'] as const,
  matches: (farmId: string, femaleId: string, goalHash: string) =>
    ['farms', farmId, 'females', femaleId, 'matches', goalHash] as const,
  explanation: (farmId: string, femaleId: string, naab: string, goalHash: string) =>
    ['explanation', farmId, femaleId, naab, goalHash] as const,
  plan: (farmId: string) => ['farms', farmId, 'plan'] as const,
  advisorOverview: () => ['advisor', 'overview'] as const,
};
