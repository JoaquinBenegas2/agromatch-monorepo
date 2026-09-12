import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  CreateReviewBodySchema, CreateServiceRequestBodySchema,
  type CreateReviewBody, type CreateServiceRequestBody, type User,
} from '@org/shared-types';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { RequestsService } from './requests.service.js';

@Controller()
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post('needs/:id/requests')
  create(
    @Param('id') needId: string,
    @Body(new ZodValidationPipe(CreateServiceRequestBodySchema)) body: CreateServiceRequestBody,
    @CurrentUser() user: User,
  ) {
    return this.requests.create(needId, body, user);
  }

  @Post('requests/:id/review')
  review(
    @Param('id') requestId: string,
    @Body(new ZodValidationPipe(CreateReviewBodySchema)) body: CreateReviewBody,
    @CurrentUser() user: User,
  ) {
    return this.requests.review(requestId, body, user);
  }
}
