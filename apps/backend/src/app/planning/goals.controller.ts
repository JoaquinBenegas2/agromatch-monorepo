import { Body, Controller, Inject, Post } from '@nestjs/common';
import type { BreedingGoal, GoalParserPort } from '@org/shared-types';
import { GOAL_PARSER_PORT } from '../../ai/tokens.js';

/**
 * C5 — vive en `PlanningModule` (decisión D1 de design.md): un solo endpoint
 * sin estado propio, no amerita su propio módulo Nest.
 */
@Controller('goals')
export class GoalsController {
  constructor(@Inject(GOAL_PARSER_PORT) private readonly goalParser: GoalParserPort) {}

  @Post('parse')
  async parse(@Body('text') text: string | undefined): Promise<BreedingGoal> {
    // REQ-D-07: con texto vacío no se llama al LLM — se devuelve BALANCED
    // directo (el front, de todos modos, ya usa el preset elegido sin pegarle
    // a este endpoint cuando el campo está vacío).
    if (!text?.trim()) {
      return { preset: 'BALANCED', weights: {}, wantBetaA2: false, wantKappaBB: false };
    }
    return this.goalParser.parse(text);
  }
}
