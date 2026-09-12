import { Global, Module } from '@nestjs/common';
import { AI_PROVIDERS } from './ai.providers.js';
import {
  CHAT_PORT,
  EXPLAINER_PORT,
  GOAL_PARSER_PORT,
  HERD_INGESTION_PORT,
  LLM_CLIENT,
  MARKET_EXPLAINER_PORT,
  NEED_INTAKE_PORT,
} from './tokens.js';

@Global()
@Module({
  providers: AI_PROVIDERS,
  exports: [
    LLM_CLIENT,
    EXPLAINER_PORT,
    MARKET_EXPLAINER_PORT,
    GOAL_PARSER_PORT,
    HERD_INGESTION_PORT,
    NEED_INTAKE_PORT,
    CHAT_PORT,
  ],
})
export class AiModule {}
