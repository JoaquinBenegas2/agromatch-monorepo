import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller.js';

/**
 * C5 arranca este módulo con `GoalsController` (`POST /goals/parse`). B5+D5
 * lo extienden con `PlanController`/`PlanService` en la sección 4 de
 * `openspec/changes/mvp-d-match/tasks.md`.
 */
@Module({
  controllers: [GoalsController],
})
export class PlanningModule {}
