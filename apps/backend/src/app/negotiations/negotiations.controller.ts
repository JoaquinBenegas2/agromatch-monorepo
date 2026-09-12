import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  SendNegotiationMessageBodySchema,
  type SendNegotiationMessageBody,
  type User,
} from '@org/shared-types';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { NegotiationsService } from './negotiations.service.js';

@Controller('negotiations')
export class NegotiationsController {
  constructor(private readonly negotiations: NegotiationsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.negotiations.list(user);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: User) {
    return this.negotiations.get(id, user);
  }

  @Post(':id/messages')
  send(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SendNegotiationMessageBodySchema)) body: SendNegotiationMessageBody,
    @CurrentUser() user: User,
  ) {
    return this.negotiations.sendMessage(id, body, user);
  }
}
