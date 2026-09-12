import type { GoalParserPort } from '@org/shared-types';
import { GoalsController } from './goals.controller';

describe('GoalsController (C5, REQ-D-07/REQ-D-15)', () => {
  it('texto vacío → BALANCED sin llamar al GoalParserPort', async () => {
    const parse = jest.fn();
    const controller = new GoalsController({ parse } as GoalParserPort);
    const goal = await controller.parse('');
    expect(goal.preset).toBe('BALANCED');
    expect(parse).not.toHaveBeenCalled();
  });

  it('texto con contenido → delega en el GoalParserPort', async () => {
    const parse = jest.fn(async () => ({
      preset: 'SOLIDS_CHEESE' as const,
      weights: {},
      wantBetaA2: false,
      wantKappaBB: false,
      rawText: 'más sólidos',
    }));
    const controller = new GoalsController({ parse } as GoalParserPort);
    const goal = await controller.parse('más sólidos');
    expect(parse).toHaveBeenCalledWith('más sólidos');
    expect(goal.preset).toBe('SOLIDS_CHEESE');
  });
});
