import { Controller, Get, Query } from '@nestjs/common';
import { NeedCategorySchema, type NeedCategory } from '@org/shared-types';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { ProvidersService } from './providers.service.js';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  list(
    @Query('category', new ZodValidationPipe(NeedCategorySchema.optional())) category?: NeedCategory,
  ) {
    return this.providers.list(category);
  }
}
