import { Module } from '@nestjs/common';
import { ExplanationService } from './explanation.service.js';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';

@Module({
  controllers: [MatchingController],
  providers: [MatchingService, ExplanationService],
  exports: [MatchingService],
})
export class MatchingModule {}
