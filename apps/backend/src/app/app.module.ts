import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ApiExceptionFilter } from '../common/errors/api-exception.filter.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RepositoriesModule } from '../repos/repositories.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MatchingModule } from './matching/matching.module.js';
import { NeedsModule } from './needs/needs.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { SmokeController } from './smoke.controller.js';

@Module({
  imports: [
    PrismaModule,
    RepositoriesModule,
    AuthModule,
    AiModule,
    NeedsModule,
    ProvidersModule,
    MatchingModule,
    RequestsModule,
  ],
  controllers: [AppController, SmokeController],
  providers: [AppService, { provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
