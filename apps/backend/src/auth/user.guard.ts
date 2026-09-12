import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../common/errors/domain-error.js';
import { USER_REPO, type UserRepo } from '../repos/user.port.js';
import type { AuthenticatedRequest } from './request.types.js';

/**
 * Autenticación simulada (RN-38, REQ-AK-03): identifica al usuario por el
 * header `x-user-id`. Sin header o usuario inexistente → 401.
 */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(@Inject(USER_REPO) private readonly userRepo: UserRepo) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.headers['x-user-id'];

    if (!userId || typeof userId !== 'string') {
      throw new DomainError(
        'USER_HEADER_MISSING',
        'Falta el header x-user-id: elegí un usuario',
        401,
      );
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new DomainError('USER_NOT_FOUND', 'El usuario no existe', 401, { userId });
    }

    request.user = user;
    return true;
  }
}
