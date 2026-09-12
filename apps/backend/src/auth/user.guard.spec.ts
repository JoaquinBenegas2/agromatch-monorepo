import type { ExecutionContext } from '@nestjs/common';
import type { User } from '@org/shared-types';
import { UserGuard } from './user.guard';
import { DomainError } from '../common/errors/domain-error';
import type { UserRepo } from '../repos/user.port';

function mockContext(headers: Record<string, string>, request: Record<string, unknown> = {}) {
  const req: Record<string, unknown> = { headers, ...request };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('UserGuard (RN-38, REQ-AK-03)', () => {
  const user: User = { id: 'tambero-a', name: 'Tambero A', role: 'FARMER', farmIds: ['farm-a'] };
  const userRepo: UserRepo = { findById: jest.fn() };

  beforeEach(() => {
    (userRepo.findById as jest.Mock).mockReset();
  });

  it('sin header x-user-id lanza 401 USER_HEADER_MISSING', async () => {
    const guard = new UserGuard(userRepo);
    const ctx = mockContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(DomainError);
    try {
      await guard.canActivate(ctx);
      fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe('USER_HEADER_MISSING');
      expect((err as DomainError).getStatus()).toBe(401);
    }
  });

  it('usuario inexistente lanza 401 USER_NOT_FOUND', async () => {
    (userRepo.findById as jest.Mock).mockResolvedValue(null);
    const guard = new UserGuard(userRepo);
    const ctx = mockContext({ 'x-user-id': 'no-existe' });
    try {
      await guard.canActivate(ctx);
      fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect((err as DomainError).code).toBe('USER_NOT_FOUND');
      expect((err as DomainError).getStatus()).toBe(401);
    }
  });

  it('usuario válido pasa y queda en request.user', async () => {
    (userRepo.findById as jest.Mock).mockResolvedValue(user);
    const guard = new UserGuard(userRepo);
    const req: Record<string, unknown> = { headers: { 'x-user-id': 'tambero-a' } };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req['user']).toEqual(user);
  });
});
