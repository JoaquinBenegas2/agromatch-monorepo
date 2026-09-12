import { Inject, Injectable } from '@nestjs/common';
import { InMemoryCache } from '@org/ai';
import { listVerticals, matchNeed } from '@org/matching-core';
import type {
  Explanation,
  MarketExplainerPort,
  MarketExplanationFacts,
  MatchBoard,
  Need,
  Provider,
  User,
} from '@org/shared-types';
import { DomainError } from '../../common/errors/domain-error.js';
import { MARKET_EXPLAINER_PORT } from '../../ai/tokens.js';
import { NEED_REPO, type NeedRepo } from '../../repos/need.port.js';
import { PROVIDER_REPO, type ProviderRepo } from '../../repos/provider.port.js';
import { assertNeedAccess } from '../needs/need-access.js';

/** Cuántos candidatos del ranking se explican con IA por búsqueda: acota
 * latencia y costo de LLM; el resto se queda con el texto determinístico. */
const EXPLAINED_TOP_N = 3;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

@Injectable()
export class MatchingService {
  // Cacheada por hash de los hechos (no por needId): dos búsquedas con los
  // mismos hechos —p. ej. recargar la página— reusan la misma explicación
  // sin volver a llamar al LLM.
  private readonly explanationCache = new InMemoryCache<Explanation>();

  constructor(
    @Inject(NEED_REPO) private readonly needs: NeedRepo,
    @Inject(PROVIDER_REPO) private readonly providers: ProviderRepo,
    @Inject(MARKET_EXPLAINER_PORT) private readonly explainer: MarketExplainerPort,
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

    // `where`/`window` ausentes no bloquean el matching: `hardFilters`
    // (RN-31) ya trata "sin ubicación"/"sin ventana" como "no se evalúa esa
    // regla", que es exactamente mostrar todo sin filtrar por ese campo.
    const [capabilities, providers] = await Promise.all([
      this.providers.listCapabilities({ category: need.category }),
      this.providers.list({ category: need.category }),
    ]);
    const board = matchNeed(need, capabilities, providers, listVerticals());
    await this.explainTopCandidates(need, board, providers);
    await this.needs.saveMatchBoard(need.id, board);
    await this.needs.update({ ...need, status: 'MATCHED' });
    return board;
  }

  /** Redacta con IA los primeros `EXPLAINED_TOP_N` candidatos del ranking
   * (RN-17/RN-18): la IA nunca calcula, solo explica hechos ya resueltos por
   * el motor, y si no valida cae al texto determinístico (`source: 'FALLBACK'`). */
  private async explainTopCandidates(need: Need, board: MatchBoard, providers: Provider[]): Promise<void> {
    const providerById = new Map(providers.map((provider) => [provider.id, provider]));
    const top = board.ranked.slice(0, EXPLAINED_TOP_N);

    await Promise.all(
      top.map(async (candidate) => {
        const provider = providerById.get(candidate.providerId);
        if (!provider) return;

        const facts: MarketExplanationFacts = {
          need: { what: need.what, category: need.category, magnitude: need.magnitude },
          provider: { name: provider.name, baseLabel: provider.base.label },
          distanceKm: need.where ? round2(haversineKm(need.where, provider.base)) : undefined,
          rank: candidate.rank,
          totalCandidates: board.ranked.length,
          compatibility: candidate.compatibility,
          // Redondeado: sin esto Claude podía citar un ajuste con 15 decimales
          // (0..1 sin redondear) y `validateNumbers` lo dejaba pasar por
          // coincidir literal, pero se leía mal en la explicación.
          fit: {
            proximity: round2(candidate.fit.proximity),
            availability: round2(candidate.fit.availability),
            capacity: round2(candidate.fit.capacity),
            price: round2(candidate.fit.price),
            reputation: round2(candidate.fit.reputation),
          },
          reasons: candidate.reasons,
        };
        const key = this.explanationCache.key(facts as unknown as Record<string, unknown>);
        candidate.explanation = await this.explanationCache.getOrCompute(key, () => this.explainer.explain(facts));
      }),
    );
  }
}
