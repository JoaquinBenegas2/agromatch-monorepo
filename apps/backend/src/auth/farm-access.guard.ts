import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DomainError } from '../common/errors/domain-error.js';
import type { AuthenticatedRequest } from './request.types.js';

/**
 * Aísla por establecimiento (RN-38, REQ-AK-03): toda ruta con `:farmId` (o
 * body/query `farmId`) verifica que pertenezca al usuario autenticado.
 */
@Injectable()
export class FarmAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const farmId =
      request.params?.farmId ?? (request.body as { farmId?: string } | undefined)?.farmId ?? (request.query?.farmId as string | undefined);

    if (!farmId) return true;

    if (!request.user.farmIds.includes(farmId)) {
      throw new DomainError('FARM_FORBIDDEN', 'No tenés acceso a este establecimiento', 403, {
        farmId,
      });
    }
    return true;
  }
}
