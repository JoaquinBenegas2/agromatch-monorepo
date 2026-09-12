import { Inject, Injectable } from '@nestjs/common';
import type { CreateNeedBody, Need, NeedIntakePort, TimeWindow, UpdateNeedBody, User } from '@org/shared-types';
import { NEED_INTAKE_PORT } from '../../ai/tokens.js';
import { DomainError } from '../../common/errors/domain-error.js';
import { NEED_REPO, type NeedRepo } from '../../repos/need.port.js';
import { assertFarmAccess, assertNeedAccess } from './need-access.js';

const MUTABLE_FIELDS = [
  'category', 'what', 'where', 'radiusKm', 'window',
  'magnitude', 'constraints', 'budget', 'goal',
] as const satisfies ReadonlyArray<keyof Need>;

const DEFAULT_WINDOW_DAYS = 365;

/**
 * Cuando el productor no dio fecha, no bloqueamos la búsqueda (RN-31 ya
 * trata `window` ausente como "no se evalúa disponibilidad", que en la
 * práctica es "mostrame todo"). En su lugar completamos un rango amplio y
 * visible para que el productor lo vea y lo pueda ajustar, en vez de dejarlo
 * bloqueado esperando un dato que la IA nunca inventó.
 */
function defaultSearchWindow(now: () => Date = () => new Date()): TimeWindow {
  const today = now();
  const to = new Date(today.getTime() + DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { from: today.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
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
      const defaulted: string[] = [];
      if (next.category !== 'GENETICS' && !next.window) {
        next.window = defaultSearchWindow();
        defaulted.push('window');
      }
      next.status = 'OPEN';
      // Ubicación ausente: no se inventa (RN sobre no inventar datos). El
      // motor ya sabe mostrar todo el país cuando `where` no está declarado.
      next.missingFields = defaulted.length > 0 ? defaulted : undefined;
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
