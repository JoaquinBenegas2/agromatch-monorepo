import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { BreedingGoalSchema } from '@org/shared-types';
import type { BreedingGoal, Explanation, MatchBoard } from '@org/shared-types';
import { FarmAccessGuard } from '../../auth/farm-access.guard.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ExplanationService } from './explanation.service.js';
import { MatchingService } from './matching.service.js';

/** B4 (ADR-0002): matching de una hembra puntual, enchufado al núcleo. */
@Controller('farms/:farmId/females/:femaleId/matches')
@UseGuards(FarmAccessGuard)
export class MatchingController {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly explanationService: ExplanationService,
  ) {}

  @Post()
  async getMatches(
    @Param('farmId') farmId: string,
    @Param('femaleId') femaleId: string,
    @Body('goal', new ZodValidationPipe(BreedingGoalSchema)) goal: BreedingGoal,
  ): Promise<MatchBoard> {
    return this.matchingService.getBoard(farmId, femaleId, goal);
  }

  @Post(':naab/explanation')
  async getExplanation(
    @Param('farmId') farmId: string,
    @Param('femaleId') femaleId: string,
    @Param('naab') naab: string,
    @Body('goal', new ZodValidationPipe(BreedingGoalSchema)) goal: BreedingGoal,
  ): Promise<Explanation> {
    return this.explanationService.getExplanation(farmId, femaleId, naab, goal);
  }
}
