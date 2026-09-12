import { Controller, Get } from '@nestjs/common';
import type { User } from '@org/shared-types';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { Roles } from '../../auth/roles.decorator.js';
import { AdvisorService } from './advisor.service.js';

@Controller('advisor')
export class AdvisorController {
  constructor(private readonly advisor: AdvisorService) {}

  @Roles('ADVISOR', 'ADMIN')
  @Get('overview')
  overview(@CurrentUser() user: User) {
    return this.advisor.overview(user);
  }
}
