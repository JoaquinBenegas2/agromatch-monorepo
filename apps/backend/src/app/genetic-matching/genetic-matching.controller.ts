import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  BreedingGoalSchema,
  ContactGeneticMatchSchema,
  type ContactGeneticMatch,
  type User,
} from '@org/shared-types';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { MatchContactService } from './match-contact.service.js';
import type { BreedingGoal, Explanation, MatchBoard } from '@org/shared-types';
import { FarmAccessGuard } from '../../auth/farm-access.guard.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ExplanationService } from './explanation.service.js';
import { GeneticMatchingService } from './genetic-matching.service.js';

/** B4 (ADR-0002): matching de una hembra puntual, enchufado al núcleo. */
@Controller('farms/:farmId/females/:femaleId/matches')
@UseGuards(FarmAccessGuard)
export class GeneticMatchingController {
  constructor(
    private readonly matchingService: GeneticMatchingService,
    private readonly explanationService: ExplanationService,
    private readonly matchContact: MatchContactService,
  ) {}

  @Post(':naab/request')
  contact(
    @Param('farmId') farmId: string,
    @Param('femaleId') femaleId: string,
    @Param('naab') naab: string,
    @Body(new ZodValidationPipe(ContactGeneticMatchSchema))
    body: ContactGeneticMatch,
    @CurrentUser() user: User,
  ) {
    return this.matchContact.contact(farmId, femaleId, naab, body, user);
  }

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
