import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type {
  BreedingGoal,
  BreedingPlan,
  SavePlanItem,
} from '@org/shared-types';
import { BreedingGoalSchema, SavePlanItemSchema } from '@org/shared-types';
import { FarmAccessGuard } from '../../auth/farm-access.guard.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { BULL_REPO, type BullRepo } from '../../repos/bull.port.js';
import {
  CLASSIFICATION_REPO,
  type ClassificationRepo,
} from '../../repos/classification.port.js';
import { FEMALE_REPO, type FemaleRepo } from '../../repos/female.port.js';
import type { FemaleCsvInfo } from './plan-csv.js';
import { planToCsv } from './plan-csv.js';
import { PlanService } from './plan.service.js';

/** B5 (REQ-D-10 a REQ-D-13): plan de servicios de un tambo. */
@Controller('farms/:farmId/plan')
@UseGuards(FarmAccessGuard)
export class PlanController {
  constructor(
    private readonly planService: PlanService,
    @Inject(FEMALE_REPO) private readonly femaleRepo: FemaleRepo,
    @Inject(CLASSIFICATION_REPO)
    private readonly classificationRepo: ClassificationRepo,
    @Inject(BULL_REPO) private readonly bullRepo: BullRepo,
  ) {}

  @Get()
  getPlan(@Param('farmId') farmId: string): Promise<BreedingPlan> {
    return this.planService.getPlan(farmId);
  }

  @Post('items')
  addItem(
    @Param('farmId') farmId: string,
    @Body(new ZodValidationPipe(SavePlanItemSchema)) item: SavePlanItem,
  ): Promise<BreedingPlan> {
    return this.planService.addItem(farmId, item);
  }

  @Delete('items/:femaleId')
  removeItem(
    @Param('farmId') farmId: string,
    @Param('femaleId') femaleId: string,
  ): Promise<BreedingPlan> {
    return this.planService.removeItem(farmId, femaleId);
  }

  @Post('auto')
  autoFill(
    @Param('farmId') farmId: string,
    @Body('goal', new ZodValidationPipe(BreedingGoalSchema)) goal: BreedingGoal,
  ): Promise<BreedingPlan> {
    return this.planService.autoFill(farmId, goal);
  }

  @Get('export.csv')
  async exportCsv(
    @Param('farmId') farmId: string,
    @Res() res: Response,
  ): Promise<void> {
    const [plan, females, bulls] = await Promise.all([
      this.planService.getPlan(farmId),
      this.femaleRepo.listByFarm(farmId),
      this.bullRepo.list(),
    ]);
    const classificationRecord =
      await this.classificationRepo.listByFarm(farmId);

    const femalesById = new Map<string, FemaleCsvInfo>(
      females.map((f) => {
        const tier =
          classificationRecord?.items.find((c) => c.femaleId === f.id)?.tier ??
          '';
        return [f.id, { visualId: f.visualId, tier }];
      }),
    );
    const bullsByNaab = new Map(bulls.map((b) => [b.naab, b]));

    const csv = planToCsv(plan, bullsByNaab, femalesById);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="plan-${farmId}.csv"`,
    );
    res.send(csv);
  }
}
