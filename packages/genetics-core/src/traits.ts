import type { GenomicProfile, TraitKey, TraitStats, TraitVector } from '@org/shared-types';
import { TRAIT_DIRECTION } from '@org/shared-types';

const TRAIT_KEYS: TraitKey[] = ['ci', 'milk', 'fat', 'pro', 'pl', 'scs', 'fs', 'rfi'];
/** Obligatorios en lecheros (docs/motor-datos-de-toros.md §2); ci/fs/rfi son "deseables". */
const REQUIRED_TRAIT_KEYS = ['milk', 'fat', 'pro', 'pl', 'scs'] as const;
const OPTIONAL_TRAIT_KEYS = ['ci', 'fs', 'rfi'] as const;

function zeroTraitVector(): TraitVector {
  return { ci: 0, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0, fs: 0, rfi: 0 };
}

/**
 * A1 (REQ-A-04): media y desvío poblacional por rasgo. Un rasgo "deseable"
 * (ci/fs/rfi) que no declara ningún perfil de la población queda en 0 --
 * `normalize` ya trata std=0 como "no normaliza" (no se rellena con un
 * promedio que nadie declaró).
 */
export function computeTraitStats(profiles: GenomicProfile[]): TraitStats {
  const mean = zeroTraitVector();
  const std = zeroTraitVector();

  for (const key of TRAIT_KEYS) {
    const values = profiles.map((p) => p.traits[key]).filter((v): v is number => v !== undefined);
    const n = values.length;
    if (n === 0) continue;
    const avg = values.reduce((a, b) => a + b, 0) / n;
    mean[key] = avg;
    const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / n;
    std[key] = Math.sqrt(variance);
  }
  return { mean, std };
}

/**
 * A1 (RN-02): promedio simple madre × padre por rasgo. Para un rasgo
 * "deseable" (ci/fs/rfi), si a cualquiera de los dos le falta el dato, ese
 * rasgo SHALL quedar sin declarar en la cría esperada -- nunca se rellena
 * con un promedio (regla de oro de `motor-datos-de-toros.md`).
 */
export function expectedProgeny(dam: TraitVector, sire: TraitVector): TraitVector {
  const result = zeroTraitVector();
  for (const key of REQUIRED_TRAIT_KEYS) {
    result[key] = (dam[key] + sire[key]) / 2;
  }
  for (const key of OPTIONAL_TRAIT_KEYS) {
    const damValue = dam[key];
    const sireValue = sire[key];
    if (damValue !== undefined && sireValue !== undefined) {
      result[key] = (damValue + sireValue) / 2;
    } else {
      delete result[key];
    }
  }
  return result;
}

/** A1 (RN-03): z-score respecto a las estadísticas, con el signo de TRAIT_DIRECTION. std=0 -> 0. */
export function normalize(value: number, key: TraitKey, stats: TraitStats): number {
  const std = stats.std[key];
  if (!std) return 0;
  const z = (value - (stats.mean[key] ?? 0)) / std;
  return TRAIT_DIRECTION[key] === -1 ? -z : z;
}
