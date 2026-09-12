import { HttpException } from '@nestjs/common';
import type { ApiError } from '@org/shared-types';

/**
 * Formato único de error de la API (convenciones §5, REQ-AK-04). Lanzar
 * `new DomainError(code, message, status, details?)` desde un servicio
 * produce ese formato a través del filtro global de excepciones.
 */
export class DomainError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message, status);
  }

  toApiError(): ApiError {
    return { code: this.code, message: this.message, details: this.details };
  }
}
