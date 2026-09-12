import type { z } from 'zod';

/** RN-18: toda salida JSON del LLM se valida; si no cumple, se lanza esto. */
export class LlmSchemaMismatchError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super('La respuesta de Claude no cumple el esquema esperado');
    this.name = 'LlmSchemaMismatchError';
  }
}

/** Fallo de red o del proveedor tras el reintento. */
export class LlmUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Claude no está disponible en este momento');
    this.name = 'LlmUnavailableError';
    this.cause = cause;
  }
}
