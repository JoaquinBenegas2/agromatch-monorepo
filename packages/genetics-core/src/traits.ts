import type { GenomicProfile, TraitKey, TraitStats, TraitVector } from '@org/shared-types';
import { TRAIT_DIRECTION } from '@org/shared-types';

const TRAIT_KEYS: TraitKey[] = ['ci', 'milk', 'fat', 'pro', 'pl', 'scs', 'fs', 'rfi'];

function zeroTraitVector(): TraitVector {
  return { ci: 0, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0, fs: 0, rfi: 0 };
}

/** A1 (REQ-A-04): media y desvío poblacional por rasgo. */
export function computeTraitStats(profiles: GenomicProfile[]): TraitStats {
  const mean = zeroTraitVector();
  const std = zeroTraitVector();
  const n = profiles.length;
  if (n === 0) return { mean, std };

  for (const key of TRAIT_KEYS) {
    const values = profiles.map((p) => p.traits[key]);
    const avg = values.reduce((a, b) => a + b, 0) / n;
    mean[key] = avg;
    const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / n;
    std[key] = Math.sqrt(variance);
  }
  return { mean, std };
}

/** A1 (RN-02): promedio simple madre × padre por rasgo. */
export function expectedProgeny(dam: TraitVector, sire: TraitVector): TraitVector {
  const result = zeroTraitVector();
  for (const key of TRAIT_KEYS) {
    result[key] = (dam[key] + sire[key]) / 2;
  }
  return result;
}

/** A1 (RN-03): z-score respecto a las estadísticas, con el signo de TRAIT_DIRECTION. std=0 -> 0. */
export function normalize(value: number, key: TraitKey, stats: TraitStats): number {
  const std = stats.std[key];
  if (!std) return 0;
  const z = (value - stats.mean[key]) / std;
  return TRAIT_DIRECTION[key] === -1 ? -z : z;
}
