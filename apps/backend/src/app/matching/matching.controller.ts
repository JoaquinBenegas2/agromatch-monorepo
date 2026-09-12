import { Controller, Param, Post } from '@nestjs/common';
import type { User } from '@org/shared-types';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { MatchingService } from './matching.service.js';

@Controller('needs')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Post(':id/matches')
  match(@Param('id') id: string, @CurrentUser() user: User) {
    return this.matching.match(id, user);
  }
}
