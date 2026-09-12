import type { FemaleCategory } from '@org/shared-types';

/** Meses completos entre dos fechas ISO (calendario, no promedio de días). */
function monthsBetween(from: string, to: string): number {
  const birth = new Date(from);
  const ref = new Date(to);
  let months = (ref.getUTCFullYear() - birth.getUTCFullYear()) * 12 + (ref.getUTCMonth() - birth.getUTCMonth());
  if (ref.getUTCDate() < birth.getUTCDate()) months -= 1;
  return months;
}

/**
 * A1 (REQ-A-04): <12 meses CALF, de 12 a 30 HEIFER, >30 COW.
 * Aproximación documentada: no distingue vaquillonas preñadas de vacías.
 */
export function deriveCategory(birthDate: string, today: string): FemaleCategory {
  const ageMonths = monthsBetween(birthDate, today);
  if (ageMonths < 12) return 'CALF';
  if (ageMonths <= 30) return 'HEIFER';
  return 'COW';
}
