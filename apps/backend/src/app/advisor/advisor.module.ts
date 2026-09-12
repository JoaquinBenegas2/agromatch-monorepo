import { Module } from '@nestjs/common';
import { AdvisorController } from './advisor.controller.js';
import { AdvisorService } from './advisor.service.js';

@Module({ controllers: [AdvisorController], providers: [AdvisorService] })
export class AdvisorModule {}
