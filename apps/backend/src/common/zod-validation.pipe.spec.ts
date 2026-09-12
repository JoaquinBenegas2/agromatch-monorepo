import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';
import { DomainError } from './errors/domain-error';

describe('ZodValidationPipe (REQ-AK-04)', () => {
  const schema = z.object({ goal: z.object({ preset: z.string() }) });

  it('body inválido lanza 400 VALIDATION_ERROR con issues no vacío', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ goal: { preset: 123 } }, { type: 'body' });
      fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      const domainErr = err as DomainError;
      expect(domainErr.code).toBe('VALIDATION_ERROR');
      expect(domainErr.getStatus()).toBe(400);
      expect((domainErr.details['issues'] as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it('body válido pasa tal cual', () => {
    const pipe = new ZodValidationPipe(schema);
    const value = { goal: { preset: 'BALANCED' } };
    expect(pipe.transform(value, { type: 'body' })).toEqual(value);
  });
});
