import type { ExecutionContext } from '@nestjs/common';
import type { User } from '@org/shared-types';
import { FarmAccessGuard } from './farm-access.guard';
import { DomainError } from '../common/errors/domain-error';

function mockContext(user: User, params: Record<string, string> = {}, body: unknown = undefined) {
  const req = { user, params, body, query: {} };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

describe('FarmAccessGuard (RN-38, REQ-AK-03)', () => {
  const tamberoB: User = { id: 'tambero-b', name: 'Tambero B', role: 'FARMER', farmIds: ['farm-b'] };
  const asesor: User = {
    id: 'asesor-1',
    name: 'Asesor 1',
    role: 'ADVISOR',
    farmIds: ['farm-a', 'farm-b', 'farm-c'],
  };

  it('tambero-b pidiendo farm-a por :farmId → 403 FARM_FORBIDDEN', () => {
    const guard = new FarmAccessGuard();
    const ctx = mockContext(tamberoB, { farmId: 'farm-a' });
    try {
      guard.canActivate(ctx);
      fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe('FARM_FORBIDDEN');
      expect((err as DomainError).getStatus()).toBe(403);
      expect((err as DomainError).details).toEqual({ farmId: 'farm-a' });
    }
  });

  it('asesor-1 accede a farm-a, farm-b y farm-c', () => {
    const guard = new FarmAccessGuard();
    for (const farmId of ['farm-a', 'farm-b', 'farm-c']) {
      expect(guard.canActivate(mockContext(asesor, { farmId }))).toBe(true);
    }
  });

  it('sin farmId en la ruta, pasa siempre', () => {
    const guard = new FarmAccessGuard();
    expect(guard.canActivate(mockContext(tamberoB, {}))).toBe(true);
  });

  it('farmId en el body también se valida', () => {
    const guard = new FarmAccessGuard();
    const ctx = mockContext(tamberoB, {}, { farmId: 'farm-a' });
    expect(() => guard.canActivate(ctx)).toThrow(DomainError);
  });
});
