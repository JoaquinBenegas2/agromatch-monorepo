import type { ArgumentsHost } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { LlmSchemaMismatchError, LlmUnavailableError } from '@org/ai';
import { ApiExceptionFilter } from './api-exception.filter';
import { DomainError } from './domain-error';

function mockHost() {
  const response = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  return { host, response };
}

describe('ApiExceptionFilter (REQ-AK-04)', () => {
  it('DomainError produce el formato { code, message, details } con su status', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();
    filter.catch(new DomainError('FARM_FORBIDDEN', 'No tenés acceso', 403, { farmId: 'farm-a' }), host);
    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({
      code: 'FARM_FORBIDDEN',
      message: 'No tenés acceso',
      details: { farmId: 'farm-a' },
    });
  });

  it('LlmUnavailableError se mapea a 502 LLM_UNAVAILABLE (REQ-LC-06)', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();
    filter.catch(new LlmUnavailableError(), host);
    expect(response.statusCode).toBe(502);
    expect((response.body as { code: string }).code).toBe('LLM_UNAVAILABLE');
  });

  it('LlmSchemaMismatchError se mapea a 502 LLM_SCHEMA_MISMATCH (REQ-LC-06)', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();
    filter.catch(new LlmSchemaMismatchError([]), host);
    expect(response.statusCode).toBe(502);
    expect((response.body as { code: string }).code).toBe('LLM_SCHEMA_MISMATCH');
  });

  it('un NotFoundException de Nest se traduce al formato único', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();
    filter.catch(new NotFoundException('Cannot GET /api/users'), host);
    expect(response.statusCode).toBe(404);
    expect((response.body as { code: string }).code).toBe('NOT_FOUND');
  });

  it('un error inesperado produce 500 INTERNAL_ERROR sin stack trace en el body', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = mockHost();
    filter.catch(new Error('boom'), host);
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado',
      details: {},
    });
  });
});
