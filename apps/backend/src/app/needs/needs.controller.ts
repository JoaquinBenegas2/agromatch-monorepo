import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  CreateNeedBodySchema, UpdateNeedBodySchema,
  type CreateNeedBody, type UpdateNeedBody, type User,
} from '@org/shared-types';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { NeedsService } from './needs.service.js';

@Controller('needs')
export class NeedsController {
  constructor(private readonly needs: NeedsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateNeedBodySchema)) body: CreateNeedBody,
    @CurrentUser() user: User,
  ) {
    return this.needs.create(body, user);
  }

  @Get()
  list(@Query('farmId') farmId: string, @CurrentUser() user: User) {
    return this.needs.list(farmId ?? '', user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.needs.findOwned(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateNeedBodySchema)) body: UpdateNeedBody,
    @CurrentUser() user: User,
  ) {
    return this.needs.update(id, body, user);
  }
}
