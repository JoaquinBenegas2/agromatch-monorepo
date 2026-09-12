import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

/** C6/B7: módulo del anexo del chat sobre el rodeo (mvp-a-core). */
@Module({
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
