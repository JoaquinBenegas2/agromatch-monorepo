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
import { hardFilters } from './filters.js';
import { listVerticals } from './registry.js';

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function daysInWindow(from: string, to: string): number {
  return Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
}

/** M2 (RN-32): pesos fijos del score genérico (Q3), sin ninguna llamada a un LLM. */
const WEIGHTS = { proximity: 0.35, availability: 0.2, capacity: 0.15, price: 0.15, reputation: 0.15 } as const;

/** M2 (RN-32): score genérico determinístico, cinco componentes en 0..1. */
export function scoreCandidate(
  need: Need,
  cap: Capability,
  prov: Provider,
): { score: number; fit: FitBreakdown; reasons: string[] } {
  const distanceKm = haversineKm(need.where, prov.base);
  const radiusKm = cap.coverageRadiusKm || need.radiusKm || 100;
  const proximity = clamp01(1 - distanceKm / Math.max(radiusKm, 1));

  let capacity = 1;
  if (need.magnitude && cap.capacityPerDay) {
    const days = daysInWindow(need.window.from, need.window.to);
    const capacityInWindow = cap.capacityPerDay.value * days;
    capacity = need.magnitude.value > 0 ? clamp01(capacityInWindow / need.magnitude.value) : 1;
  }

  const price = need.budget && cap.priceFrom ? clamp01(1 - cap.priceFrom / need.budget) : 1;

  const reasons: string[] = [`A ${distanceKm.toFixed(1)} km de distancia, dentro del radio de cobertura de ${radiusKm} km`];
  let reputation: number;
  if (prov.reputation.avg !== null) {
    reputation = clamp01(prov.reputation.avg / 5);
  } else {
    reputation = 0;
    reasons.push('Sin valoraciones todavía: no se rellena con un promedio');
  }

  const fit: FitBreakdown = { proximity, availability: 1, capacity, price, reputation };
  const score =
    100 *
    (WEIGHTS.proximity * fit.proximity +
      WEIGHTS.availability * fit.availability +
      WEIGHTS.capacity * fit.capacity +
      WEIGHTS.price * fit.price +
      WEIGHTS.reputation * fit.reputation);

  return { score, fit, reasons };
}

interface ScoredEntry {
  candidate: MatchCandidate;
  rawScore: number;
  hasVertical: boolean;
}

/**
 * M2 (RN-31 → RN-33 → RN-35, ADR-0002): filtros duros por candidato, delega
 * en el `VerticalEngine` registrado para la categoría (si hay), y reescala
 * a `compatibility` 0..100 en un solo paso sobre todos los `ranked`.
 */
export function matchNeed(
  need: Need,
  caps: Capability[],
  provs: Provider[],
  verticals: VerticalEngine[] = listVerticals(),
  ctx?: unknown,
): MatchBoard {
  const vertical = verticals.find((v) => v.canHandle(need));
  const relevantCaps = caps.filter((c) => c.category === need.category);
  const excluded: MatchCandidate[] = [];
  const passing: ScoredEntry[] = [];

  for (const cap of relevantCaps) {
    const provider = provs.find((p) => p.id === cap.providerId);
    if (!provider) continue;

    const filters = hardFilters(need, cap, provider);
    const baseCandidate: MatchCandidate = {
      needId: need.id,
      capabilityId: cap.id,
      providerId: cap.providerId,
      score: 0,
      compatibility: 0,
      rank: 0,
      fit: { proximity: 0, availability: 0, capacity: 0, price: 0, reputation: 0 },
      filters,
      reasons: [],
    };

    if (filters.some((f) => !f.passed)) {
      excluded.push(baseCandidate);
      continue;
    }

    const { score: genericScore, fit, reasons } = scoreCandidate(need, cap, provider);
    let rawScore = genericScore;
    let hasVertical = false;

    if (vertical) {
      const scoredCandidate: MatchCandidate = { ...baseCandidate, score: genericScore, fit, reasons };
      const verticalResult = vertical.score(need, scoredCandidate, ctx);
      if (verticalResult.score === -Infinity) {
        const verticalFilters = ((verticalResult.facts as { filters?: FilterResult[] } | undefined)?.filters ?? []) as FilterResult[];
        excluded.push({
          ...baseCandidate,
          filters: verticalFilters,
          reasons: [...reasons, ...verticalResult.reasons],
          verticalFacts: verticalResult.facts,
        });
        continue;
      }
      rawScore = verticalResult.score;
      hasVertical = true;
      passing.push({
        candidate: { ...baseCandidate, fit, reasons: [...reasons, ...verticalResult.reasons], verticalFacts: verticalResult.facts },
        rawScore,
        hasVertical,
      });
      continue;
    }

    passing.push({ candidate: { ...baseCandidate, fit, reasons }, rawScore, hasVertical });
  }

  const n = passing.length;
  const min = n ? Math.min(...passing.map((p) => p.rawScore)) : 0;
  const max = n ? Math.max(...passing.map((p) => p.rawScore)) : 0;
  const spread = max - min;

  passing.sort((a, b) => b.rawScore - a.rawScore || a.candidate.providerId.localeCompare(b.candidate.providerId));

  const ranked: MatchCandidate[] = passing.map((entry, i) => {
    const compatibility = n <= 1 || spread === 0 ? 100 : Math.round((100 * (entry.rawScore - min)) / spread);
    const fit = entry.hasVertical ? { ...entry.candidate.fit, vertical: compatibility / 100 } : entry.candidate.fit;
    return { ...entry.candidate, score: entry.rawScore, compatibility, rank: i + 1, fit };
  });

  return { ranked, excluded };
}
