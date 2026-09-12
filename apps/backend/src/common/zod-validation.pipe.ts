import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { DomainError } from './errors/domain-error.js';

/**
 * `ValidationPipe` basado en zod (REQ-AK-04). Un body/query/params que no
 * valida contra su esquema produce 400 `VALIDATION_ERROR` con los issues de
 * zod en `details`.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new DomainError('VALIDATION_ERROR', 'Los datos enviados no son válidos', 400, {
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
