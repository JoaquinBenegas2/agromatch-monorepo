import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@org/shared-types';
import { RolesGuard } from './roles.guard';
import { DomainError } from '../common/errors/domain-error';

function mockContext(user: User): ExecutionContext {
  const req = { user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard (REQ-AK-03: GET /advisor/overview solo ADVISOR|ADMIN)', () => {
  const farmer: User = { id: 'tambero-a', name: 'Tambero A', role: 'FARMER', farmIds: ['farm-a'] };
  const advisor: User = { id: 'asesor-1', name: 'Asesor 1', role: 'ADVISOR', farmIds: [] };

  it('sin @Roles() en la ruta, pasa siempre', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext(farmer))).toBe(true);
  });

  it('FARMER contra una ruta @Roles(ADVISOR, ADMIN) → 403 ROLE_FORBIDDEN', () => {
    const reflector = { getAllAndOverride: () => ['ADVISOR', 'ADMIN'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    try {
      guard.canActivate(mockContext(farmer));
      fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe('ROLE_FORBIDDEN');
      expect((err as DomainError).getStatus()).toBe(403);
    }
  });

  it('ADVISOR contra la misma ruta pasa', () => {
    const reflector = { getAllAndOverride: () => ['ADVISOR', 'ADMIN'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext(advisor))).toBe(true);
  });
});
