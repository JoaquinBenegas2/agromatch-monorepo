import { Controller, Get, Inject } from '@nestjs/common';
import type { Bull, MeResponse } from '@org/shared-types';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { BULL_REPO, type BullRepo } from '../repos/bull.port.js';
import { FARM_REPO, type FarmRepo } from '../repos/farm.port.js';
import type { AuthenticatedRequest } from '../auth/request.types.js';

/** Endpoints de humo de api-skeleton (REQ-AK-06): GET /me y GET /bulls. */
@Controller()
export class SmokeController {
  constructor(
    @Inject(FARM_REPO) private readonly farmRepo: FarmRepo,
    @Inject(BULL_REPO) private readonly bullRepo: BullRepo,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedRequest['user']): Promise<MeResponse> {
    const farms = await this.farmRepo.findByIds(user.farmIds);
    return { user, farms };
  }

  @Get('bulls')
  async bulls(): Promise<Bull[]> {
    return this.bullRepo.list();
  }
}
