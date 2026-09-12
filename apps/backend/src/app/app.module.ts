import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RepositoriesModule } from '../repos/repositories.module.js';
import { ClassificationModule } from '../classification/classification.module.js';
import { HerdImportModule } from '../herd-import/herd-import.module.js';
import { HerdModule } from '../herd/herd.module.js';
import { AdvisorModule } from './advisor/advisor.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ChatModule } from './chat/chat.module.js';
import { GeneticMatchingModule } from './genetic-matching/genetic-matching.module.js';
import { MatchingModule } from './matching/matching.module.js';
import { NeedsModule } from './needs/needs.module.js';
import { PlanningModule } from './planning/planning.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { SmokeController } from './smoke.controller.js';

@Module({
  imports: [
    PrismaModule,
    RepositoriesModule,
    AuthModule,
    AiModule,
    ChatModule,
    NeedsModule,
    ProvidersModule,
    MatchingModule,
    GeneticMatchingModule,
    PlanningModule,
    RequestsModule,
    HerdImportModule,
    ClassificationModule,
    HerdModule,
    AdvisorModule,
  ],
  controllers: [AppController, SmokeController],
  providers: [AppService, { provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
