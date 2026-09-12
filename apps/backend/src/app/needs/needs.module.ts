import { Module } from '@nestjs/common';
import { NeedsController } from './needs.controller.js';
import { NeedsService } from './needs.service.js';

@Module({ controllers: [NeedsController], providers: [NeedsService], exports: [NeedsService] })
export class NeedsModule {}
