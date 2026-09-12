import type { Need, User } from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';

export function assertFarmAccess(user: User, farmId: string): void {
  if (!user.farmIds.includes(farmId)) {
    throw new DomainError('FARM_FORBIDDEN', 'No tenés acceso a este establecimiento', 403, {
      farmId,
    });
  }
}

export function assertNeedAccess(user: User, need: Need): void {
  assertFarmAccess(user, need.farmId);
}
