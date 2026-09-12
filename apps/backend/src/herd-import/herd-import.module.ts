import { Module } from '@nestjs/common'; import { HerdImportController } from './herd-import.controller.js'; import { HerdImportService } from './herd-import.service.js';
@Module({ controllers: [HerdImportController], providers: [HerdImportService] }) export class HerdImportModule {}
