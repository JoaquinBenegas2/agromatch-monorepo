import { Inject, Injectable } from '@nestjs/common';
import type { CreateNeedBody, Need, NeedIntakePort, UpdateNeedBody, User } from '@org/shared-types';
import { NEED_INTAKE_PORT } from '../../ai/tokens.js';
import { DomainError } from '../../common/errors/domain-error.js';
import { NEED_REPO, type NeedRepo } from '../../repos/need.port.js';
import { assertFarmAccess, assertNeedAccess } from './need-access.js';

const MUTABLE_FIELDS = [
  'category', 'what', 'where', 'radiusKm', 'window',
  'magnitude', 'constraints', 'budget', 'goal',
] as const satisfies ReadonlyArray<keyof Need>;

function missingRequiredFields(need: Need): string[] {
  if (need.category === 'GENETICS') return [];
  return [!need.where ? 'where' : null, !need.window ? 'window' : null].filter(
    (field): field is string => field !== null,
  );
}

@Injectable()
export class NeedsService {
  constructor(
    @Inject(NEED_REPO) private readonly needs: NeedRepo,
    @Inject(NEED_INTAKE_PORT) private readonly intake: NeedIntakePort,
  ) {}

  async create(body: CreateNeedBody, user: User): Promise<Need> {
    assertFarmAccess(user, body.farmId);
    const need = await this.intake.parse(body.rawText, body.farmId);
    return this.needs.create({ ...need, farmId: body.farmId, rawText: body.rawText, status: 'DRAFT' });
  }

  async list(farmId: string, user: User): Promise<Need[]> {
    assertFarmAccess(user, farmId);
    return this.needs.listByFarm(farmId);
  }

  async update(id: string, body: UpdateNeedBody, user: User): Promise<Need> {
    const current = await this.findOwned(id, user);
    const next: Need = { ...current };

    for (const field of MUTABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        Object.assign(next, { [field]: body[field] });
      }
    }

    const stillMissing = new Set(current.missingFields ?? []);
    for (const field of MUTABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field) && body[field] !== undefined) {
        stillMissing.delete(field);
      }
    }

    if (body.confirm) {
      const required = missingRequiredFields(next);
      if (required.length > 0) {
        throw new DomainError(
          'NEED_INCOMPLETE',
          'Completá fecha y lugar antes de buscar proveedores',
          409,
          { missingFields: required },
        );
      }
      next.status = 'OPEN';
      next.missingFields = undefined;
    } else {
      next.missingFields = stillMissing.size > 0 ? [...stillMissing] : undefined;
    }

    return this.needs.update(next);
  }

  async findOwned(id: string, user: User): Promise<Need> {
    const need = await this.needs.findById(id);
    if (!need) {
      throw new DomainError('NEED_NOT_FOUND', 'La necesidad no existe', 404, { needId: id });
    }
    assertNeedAccess(user, need);
    return need;
  }
}
