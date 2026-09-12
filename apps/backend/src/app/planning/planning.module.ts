import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller.js';
import { PlanController } from './plan.controller.js';
import { PlanService } from './plan.service.js';

/**
 * C5 (`GoalsController`, `POST /goals/parse`) + B5/D5 (`PlanController`/
 * `PlanService`, el plan de servicios). Nota: `goals.controller.ts` también
 * existe en la PR #23 (C5) — mismo contenido, se resuelve trivial al mergear
 * en orden (recomendado: #23 antes que esta).
 */
@Module({
  controllers: [GoalsController, PlanController],
  providers: [PlanService],
})
export class PlanningModule {}
