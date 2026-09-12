import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@org/shared-types';
import { DomainError } from '../common/errors/domain-error.js';
import { ROLES_KEY } from './roles.decorator.js';
import type { AuthenticatedRequest } from './request.types.js';

/** `GET /advisor/overview` exige `role === 'ADVISOR' | 'ADMIN'` → 403 (REQ-AK-03). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!allowedRoles.includes(request.user.role)) {
      throw new DomainError('ROLE_FORBIDDEN', 'Tu rol no tiene acceso a esta pantalla', 403, {
        role: request.user.role,
      });
    }
    return true;
  }
}
