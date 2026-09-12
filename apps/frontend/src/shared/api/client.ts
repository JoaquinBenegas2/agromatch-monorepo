import type { ZodType } from 'zod';
import type { ApiError } from '@org/shared-types';
import { getActiveUserId } from '../user/user-context.js';

/** REQ-FS-04: errores del backend con su `code`/`message` reales. */
export class ApiClientError extends Error {
  code: string;
  details: Record<string, unknown>;
  status: number;

  constructor(apiError: ApiError, status: number) {
    super(apiError.message);
    this.name = 'ApiClientError';
    this.code = apiError.code;
    this.details = apiError.details;
    this.status = status;
  }
}

function baseHeaders(): HeadersInit {
  return { 'x-user-id': getActiveUserId() };
}

async function parseResponse<T>(response: Response, schema: ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const apiError = body as ApiError;
    throw new ApiClientError(
      apiError ?? { code: 'UNKNOWN_ERROR', message: 'Error desconocido', details: {} },
      response.status,
    );
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw new Error(
      `La respuesta de la API no cumple el contrato en "${firstIssue?.path.join('.')}": ${firstIssue?.message}`,
    );
  }
  return result.data;
}

/** Cliente `fetch` tipado (REQ-FS-04): agrega `x-user-id` y valida con zod. */
export const api = {
  async get<T>(path: string, schema: ZodType<T>): Promise<T> {
    const response = await fetch(`/api${path}`, { headers: baseHeaders() });
    return parseResponse(response, schema);
  },

  async post<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> {
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { ...baseHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return parseResponse(response, schema);
  },

  async patch<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T> {
    const response = await fetch(`/api${path}`, {
      method: 'PATCH',
      headers: { ...baseHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return parseResponse(response, schema);
  },

  async delete<T>(path: string, schema: ZodType<T>): Promise<T> {
    const response = await fetch(`/api${path}`, { method: 'DELETE', headers: baseHeaders() });
    return parseResponse(response, schema);
  },

  async upload<T>(path: string, file: File, schema: ZodType<T>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`/api${path}`, {
      method: 'POST',
      headers: baseHeaders(),
      body: formData,
    });
    return parseResponse(response, schema);
  },
};
