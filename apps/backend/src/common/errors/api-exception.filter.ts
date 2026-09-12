import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError } from '@org/shared-types';
import { LlmSchemaMismatchError, LlmUnavailableError } from '@org/ai';
import { DomainError } from './domain-error.js';

/**
 * Filtro global de excepciones (REQ-AK-04): toda respuesta de error tiene la
 * forma `{ code, message, details }`. RN-LC-06: los errores del LLM se
 * mapean a 502 con `LLM_UNAVAILABLE` / `LLM_SCHEMA_MISMATCH`.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.toApiResponse(exception);
    if (status >= 500) this.logger.error(exception);
    response.status(status).json(body);
  }

  private toApiResponse(exception: unknown): { status: number; body: ApiError } {
    if (exception instanceof DomainError) {
      return { status: exception.getStatus(), body: exception.toApiError() };
    }

    if (exception instanceof LlmUnavailableError) {
      return {
        status: HttpStatus.BAD_GATEWAY,
        body: { code: 'LLM_UNAVAILABLE', message: 'El servicio de IA no está disponible', details: {} },
      };
    }

    if (exception instanceof LlmSchemaMismatchError) {
      return {
        status: HttpStatus.BAD_GATEWAY,
        body: {
          code: 'LLM_SCHEMA_MISMATCH',
          message: 'La IA devolvió una respuesta que no cumple el esquema esperado',
          details: { issues: exception.issues },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] })?.message ?? exception.message);
      return {
        status,
        body: {
          code: httpStatusToCode(status),
          message: Array.isArray(message) ? message.join('; ') : message,
          details: typeof response === 'object' ? (response as Record<string, unknown>) : {},
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado', details: {} },
    };
  }
}

function httpStatusToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'USER_HEADER_MISSING';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    default:
      return 'INTERNAL_ERROR';
  }
}
