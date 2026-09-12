import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import type { ChatAnswer } from '@org/shared-types';
import { ChatBodySchema } from '@org/shared-types';
import { FarmAccessGuard } from '../../auth/farm-access.guard.js';
import { DomainError } from '../../common/errors/domain-error.js';
import { ChatService } from './chat.service.js';

/** C6/B7 (REQ-A-CHAT-02): `POST /farms/:farmId/chat`. */
@Controller('farms/:farmId/chat')
@UseGuards(FarmAccessGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async ask(@Param('farmId') farmId: string, @Body() body: unknown): Promise<ChatAnswer> {
    const parsed = ChatBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainError('VALIDATION_ERROR', 'Falta la pregunta (question)', 400, {
        issues: parsed.error.issues,
      });
    }
    return this.chatService.ask(farmId, parsed.data.question);
  }
}
