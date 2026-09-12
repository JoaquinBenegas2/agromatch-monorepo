import { Module } from '@nestjs/common';
import { ExplanationService } from './explanation.service.js';
import { GeneticMatchingController } from './genetic-matching.controller.js';
import { GeneticMatchingService } from './genetic-matching.service.js';
import { MatchContactService } from './match-contact.service.js';
import { RequestsModule } from '../requests/requests.module.js';

@Module({
  imports: [RequestsModule],
  controllers: [GeneticMatchingController],
  providers: [GeneticMatchingService, ExplanationService, MatchContactService],
  exports: [GeneticMatchingService],
})
export class GeneticMatchingModule {}
