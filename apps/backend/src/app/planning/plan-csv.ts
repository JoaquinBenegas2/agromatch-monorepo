import type { BreedingPlan, Bull } from '@org/shared-types';

const BOM = '﻿';

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export interface FemaleCsvInfo {
  visualId: string;
  tier: string;
}

/**
 * REQ-D-13: columnas `visualId, tier, toro, central, tipoSemen,
 * compatibilidad, precio`, BOM UTF-8 para que Excel muestre bien las tildes.
 * Ni `visualId` ni `tier` viajan en `PlanItem` (que solo guarda el id interno
 * de la hembra): se resuelven contra la hembra y su clasificación.
 */
export function planToCsv(
  plan: BreedingPlan,
  bullsByNaab: Map<string, Bull>,
  femalesById: Map<string, FemaleCsvInfo>,
): string {
  const header = ['visualId', 'tier', 'toro', 'central', 'tipoSemen', 'compatibilidad', 'precio'];
  const rows = [...plan.items]
    .sort((a, b) => {
      const va = femalesById.get(a.femaleId)?.visualId ?? a.femaleId;
      const vb = femalesById.get(b.femaleId)?.visualId ?? b.femaleId;
      return va.localeCompare(vb);
    })
    .map((item) => {
      const bull = bullsByNaab.get(item.bullNaab);
      const female = femalesById.get(item.femaleId);
      return [
        female?.visualId ?? item.femaleId,
        female?.tier ?? '',
        bull?.name ?? item.bullNaab,
        bull?.company ?? '',
        item.semenType,
        String(item.compatibility),
        item.pricePerDose != null ? String(item.pricePerDose) : '',
      ]
        .map(escapeCsv)
        .join(',');
    });

  return BOM + [header.join(','), ...rows].join('\n');
}
