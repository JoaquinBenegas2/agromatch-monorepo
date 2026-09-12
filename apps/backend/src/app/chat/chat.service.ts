import { Inject, Injectable } from '@nestjs/common';
import type { ChatAnswer, ChatPort, HerdQueryTools, Tier } from '@org/shared-types';
import { CHAT_PORT } from '../../ai/tokens.js';
import { DomainError } from '../../common/errors/domain-error.js';
import { CLASSIFICATION_REPO, type ClassificationRepo } from '../../repos/classification.port.js';
import { FEMALE_REPO, type FemaleRepo } from '../../repos/female.port.js';

const EMPTY_COUNTS: Record<Tier, number> = { ELITE: 0, COMMERCIAL: 0, BEEF: 0, CULL_ALERT: 0 };

/**
 * C6/B7 (REQ-A-CHAT-02): construye `HerdQueryTools` sobre `FemaleRepo` y
 * `ClassificationRepo` del establecimiento y delega en `ChatPort`. 409
 * `HERD_NOT_CLASSIFIED` si el rodeo no está clasificado todavía.
 */
@Injectable()
export class ChatService {
  constructor(
    @Inject(CHAT_PORT) private readonly chatPort: ChatPort,
    @Inject(FEMALE_REPO) private readonly femaleRepo: FemaleRepo,
    @Inject(CLASSIFICATION_REPO) private readonly classificationRepo: ClassificationRepo,
  ) {}

  async ask(farmId: string, question: string): Promise<ChatAnswer> {
    const classified = await this.classificationRepo.listByFarm(farmId);
    if (!classified) {
      throw new DomainError('HERD_NOT_CLASSIFIED', 'Clasificá el rodeo antes de preguntar', 409);
    }

    const byFemaleId = new Map(classified.items.map((c) => [c.femaleId, c]));

    const tools: HerdQueryTools = {
      countByTier: async () => {
        const counts: Record<Tier, number> = { ...EMPTY_COUNTS };
        for (const c of classified.items) counts[c.tier] += 1;
        return counts;
      },
      listFemales: async (_farmId, filter) => {
        const females = await this.femaleRepo.listByFarm(farmId);
        const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 20) : 20;
        return females
          .filter((f) => {
            const classification = byFemaleId.get(f.id);
            if (filter.tier && classification?.tier !== filter.tier) return false;
            if (filter.tag && !classification?.tags.includes(filter.tag)) return false;
            return true;
          })
          .slice(0, limit);
      },
      explainClassification: async (_farmId, femaleId) => {
        const females = await this.femaleRepo.listByFarm(farmId);
        const female = females.find((f) => f.id === femaleId || f.visualId === femaleId);
        if (!female) return [];
        return byFemaleId.get(female.id)?.reasons ?? [];
      },
    };

    return this.chatPort.ask(farmId, question, tools);
  }
}
