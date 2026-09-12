import { Module } from '@nestjs/common';
import { NegotiationsController } from './negotiations.controller.js';
import { NegotiationsService } from './negotiations.service.js';

@Module({ controllers: [NegotiationsController], providers: [NegotiationsService] })
export class NegotiationsModule {}
