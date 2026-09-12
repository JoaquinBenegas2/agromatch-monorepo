import { Body, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ColumnMappingSchema } from '@org/shared-types';
import { FarmAccessGuard } from '../auth/farm-access.guard.js';
import { DomainError } from '../common/errors/domain-error.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { HerdImportService } from './herd-import.service.js';
@Controller('farms/:farmId/herd-imports') @UseGuards(FarmAccessGuard)
export class HerdImportController { constructor(private readonly service: HerdImportService) {}
  @Post() @UseInterceptors(FileInterceptor('file')) create(@Param('farmId') farmId: string, @UploadedFile() file: Express.Multer.File | undefined) { if (!file) throw new DomainError('FILE_NOT_SPREADSHEET', 'El archivo debe ser .xls o .xlsx', 400); return this.service.create(farmId, file); }
  @Post(':importId/confirm') confirm(@Param('farmId') farmId: string, @Param('importId') importId: string, @Body(new ZodValidationPipe(ColumnMappingSchema)) mapping: unknown) { return this.service.confirm(farmId, importId, mapping as never); }
}
