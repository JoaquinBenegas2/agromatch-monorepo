import type {
  Capability,
  FilterResult,
  FitBreakdown,
  MatchBoard,
  MatchCandidate,
  Need,
  Provider,
  VerticalEngine,
} from '@org/shared-types';

/**
 * `matching-core` — núcleo genérico de matcheo (necesidad × capacidad). TS
 * puro: no conoce Nest, Prisma ni el LLM. Un vertical se registra con
 * `registerVertical`; el núcleo no lo conoce de antemano (RN-35, ADR-0002).
 *
 * Stubs de T0: `hardFilters` devuelve todo `passed: true`; `matchNeed`
 * puntúa por cercanía y reescala; si hay un vertical que `canHandle`, llama
 * a `score` y usa ese puntaje.
 */

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Stub: todos los filtros duros pasan (RN-31, se completa en M2). */
export function hardFilters(_need: Need, _cap: Capability, _prov: Provider): FilterResult[] {
  return [{ rule: 'RN-31', passed: true, detail: 'Sin filtros duros aplicados (stub T0)' }];
}

/** Stub: puntúa solo por cercanía entre `need.where` y `prov.base`. */
export function scoreCandidate(
  need: Need,
  cap: Capability,
  prov: Provider,
): { score: number; fit: FitBreakdown; reasons: string[] } {
  if (!need.where) {
    throw new Error('Cannot score an unconfirmed need without location');
  }
  const distanceKm = haversineKm(need.where, prov.base);
  const radiusKm = cap.coverageRadiusKm || need.radiusKm || 100;
  const proximity = clamp01(1 - distanceKm / Math.max(radiusKm, 1));
  const fit: FitBreakdown = {
    proximity,
    availability: 1,
    capacity: 1,
    price: 1,
    reputation: prov.reputation.avg !== null ? clamp01(prov.reputation.avg / 5) : 0.5,
  };
  const score =
    100 * (0.4 * fit.proximity + 0.2 * fit.availability + 0.2 * fit.capacity + 0.1 * fit.price + 0.1 * fit.reputation);
  const reasons = [
    `A ${distanceKm.toFixed(1)} km de distancia, dentro del radio de cobertura de ${radiusKm} km`,
  ];
  return { score, fit, reasons };
}

/** Stub: puntúa por cercanía; delega en el vertical registrado si `canHandle`. */
export function matchNeed(
  need: Need,
  caps: Capability[],
  provs: Provider[],
  verticals: VerticalEngine[],
  ctx?: unknown,
): MatchBoard {
  if (!need.where || !need.window) {
    throw new Error('Cannot match an unconfirmed need without location and time window');
  }
  const vertical = verticals.find((v) => v.canHandle(need));
  const relevantCaps = caps.filter((c) => c.category === need.category);

  const candidates = relevantCaps
    .map((cap) => {
      const provider = provs.find((p) => p.id === cap.providerId);
      if (!provider) return null;

      const filters = hardFilters(need, cap, provider);
      const { score: baseScore, fit, reasons } = scoreCandidate(need, cap, provider);

      const candidate: MatchCandidate = {
        needId: need.id,
        capabilityId: cap.id,
        providerId: cap.providerId,
        score: baseScore,
        compatibility: 0,
        rank: 0,
        fit,
        filters,
        reasons,
      };

      if (vertical) {
        const verticalResult = vertical.score(need, candidate, ctx);
        candidate.score = verticalResult.score;
        candidate.fit = { ...fit, vertical: clamp01(verticalResult.score / 100) };
        candidate.verticalFacts = verticalResult.facts;
        candidate.reasons = [...reasons, ...verticalResult.reasons];
      }

      return candidate;
    })
    .filter((c): c is MatchCandidate => c !== null);

  candidates.sort((a, b) => b.score - a.score);
  const n = candidates.length;

  const ranked = candidates.map((candidate, i) => ({
    ...candidate,
    compatibility: n <= 1 ? 100 : Math.round((100 * (n - i)) / n),
    rank: i + 1,
  }));

  return { ranked, excluded: [] };
}

const verticalRegistry: VerticalEngine[] = [];

/** Un vertical se registra; el núcleo no lo conoce de antemano (RN-35). */
export function registerVertical(engine: VerticalEngine): void {
  if (verticalRegistry.some((v) => v.category === engine.category)) return;
  verticalRegistry.push(engine);
}

export function listVerticals(): VerticalEngine[] {
  return [...verticalRegistry];
}
