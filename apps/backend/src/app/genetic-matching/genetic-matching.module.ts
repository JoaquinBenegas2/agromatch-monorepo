import { Module } from '@nestjs/common';
import { ExplanationService } from './explanation.service.js';
import { GeneticMatchingController } from './genetic-matching.controller.js';
import { GeneticMatchingService } from './genetic-matching.service.js';

@Module({
  controllers: [GeneticMatchingController],
  providers: [GeneticMatchingService, ExplanationService],
  exports: [GeneticMatchingService],
})
export class GeneticMatchingModule {}
