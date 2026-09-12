import { Inject, Injectable } from '@nestjs/common';
import { listVerticals, matchNeed } from '@org/matching-core';
import type { MatchBoard, User } from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';
import { NEED_REPO, type NeedRepo } from '../../repos/need.port.js';
import { PROVIDER_REPO, type ProviderRepo } from '../../repos/provider.port.js';
import { assertNeedAccess } from '../needs/need-access.js';

@Injectable()
export class MatchingService {
  constructor(
    @Inject(NEED_REPO) private readonly needs: NeedRepo,
    @Inject(PROVIDER_REPO) private readonly providers: ProviderRepo,
  ) {}

  async match(needId: string, user: User): Promise<MatchBoard> {
    const need = await this.needs.findById(needId);
    if (!need) {
      throw new DomainError('NEED_NOT_FOUND', 'La necesidad no existe', 404, { needId });
    }
    assertNeedAccess(user, need);
    if (need.status === 'DRAFT') {
      throw new DomainError(
        'NEED_NOT_CONFIRMED',
        'Confirmá la necesidad antes de buscar proveedores',
        409,
        { needId },
      );
    }
    const missingFields = [!need.where ? 'where' : null, !need.window ? 'window' : null].filter(
      (field): field is string => field !== null,
    );
    if (missingFields.length > 0) {
      throw new DomainError(
        'NEED_INCOMPLETE',
        'La necesidad no tiene fecha y lugar para ejecutar el matching general',
        409,
        { missingFields },
      );
    }

    const [capabilities, providers] = await Promise.all([
      this.providers.listCapabilities({ category: need.category }),
      this.providers.list({ category: need.category }),
    ]);
    const board = matchNeed(need, capabilities, providers, listVerticals());
    await this.needs.saveMatchBoard(need.id, board);
    await this.needs.update({ ...need, status: 'MATCHED' });
    return board;
  }
}
