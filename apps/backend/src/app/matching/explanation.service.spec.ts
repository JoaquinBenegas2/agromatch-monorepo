import type { Explanation, ExplainerPort, MatchBoard } from '@org/shared-types';
import { ExplanationService } from './explanation.service';
import { DomainError } from '../../common/errors/domain-error';
import type { MatchingService } from './matching.service';

const facts = { femaleVisualId: '3031', bull: { naab: '029HO20544' } };

function board(): MatchBoard {
  return {
    ranked: [
      {
        needId: 'synthetic:farm-a:fem-3031',
        capabilityId: '029HO20544',
        providerId: 'prov-genetics-norte',
        score: 95,
        compatibility: 100,
        rank: 1,
        fit: { proximity: 1, availability: 1, capacity: 1, price: 1, reputation: 1 },
        filters: [],
        verticalFacts: facts,
        reasons: [],
      },
    ],
    excluded: [],
  };
}

describe('ExplanationService (REQ-D-05)', () => {
  it('cachea por hash de los hechos: dos pedidos iguales, una sola invocación del ExplainerPort', async () => {
    const explain = jest.fn(async (): Promise<Explanation> => ({ text: 'ok', source: 'AI' }));
    const explainer: ExplainerPort = { explain };
    const getBoard = jest.fn(async () => board());
    const matchingService = { getBoard } as unknown as MatchingService;
    const goal = { preset: 'BALANCED' as const, weights: {}, wantBetaA2: false, wantKappaBB: false };

    const service = new ExplanationService(explainer, matchingService);
    const first = await service.getExplanation('farm-a', 'fem-3031', '029HO20544', goal);
    const second = await service.getExplanation('farm-a', 'fem-3031', '029HO20544', goal);

    expect(first).toEqual(second);
    expect(explain).toHaveBeenCalledTimes(1);
  });

  it('toro que no está en el MatchBoard → 404 BULL_NOT_FOUND', async () => {
    const explainer: ExplainerPort = { explain: jest.fn() };
    const matchingService = { getBoard: jest.fn(async () => board()) } as unknown as MatchingService;
    const goal = { preset: 'BALANCED' as const, weights: {}, wantBetaA2: false, wantKappaBB: false };

    const service = new ExplanationService(explainer, matchingService);
    await expect(
      service.getExplanation('farm-a', 'fem-3031', 'NO-EXISTE', goal),
    ).rejects.toMatchObject({ code: 'BULL_NOT_FOUND' });
    await expect(
      service.getExplanation('farm-a', 'fem-3031', 'NO-EXISTE', goal),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
