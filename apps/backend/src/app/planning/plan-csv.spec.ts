import type { BreedingPlan, Bull } from '@org/shared-types';
import { planToCsv } from './plan-csv';

describe('planToCsv (REQ-D-13)', () => {
  it('empieza con el BOM UTF-8 y tiene las 7 columnas en orden', () => {
    const plan: BreedingPlan = {
      id: 'plan-1',
      farmId: 'farm-a',
      createdAt: new Date().toISOString(),
      items: [
        { femaleId: 'fem-1', bullNaab: '029HO20544', semenType: 'SEXED', compatibility: 95, pricePerDose: 16 },
      ],
      totals: { doses: { SEXED: 1, CONVENTIONAL: 0, BEEF: 0 }, cost: 16, avgExpectedProgeny: {} },
    };
    const bull: Bull = {
      naab: '029HO20544',
      name: 'Don Rufino 4012',
      company: 'Central Genética Norte',
      breed: 'HO',
      profile: null,
      sireNaab: null,
      calvingEase: null,
      semenTypes: ['SEXED'],
      pricePerDose: 16,
      source: 'test',
    };

    const csv = planToCsv(
      plan,
      new Map([[bull.naab, bull]]),
      new Map([['fem-1', { visualId: '3031', tier: 'COMMERCIAL' }]]),
    );

    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.replace('﻿', '').split('\n');
    expect(lines[0]).toBe('visualId,tier,toro,central,tipoSemen,compatibilidad,precio');
    expect(lines[1]).toBe('3031,COMMERCIAL,Don Rufino 4012,Central Genética Norte,SEXED,95,16');
  });

  it('un toro con nombre con coma no rompe las columnas', () => {
    const plan: BreedingPlan = {
      id: 'plan-1',
      farmId: 'farm-a',
      createdAt: new Date().toISOString(),
      items: [
        { femaleId: 'fem-1', bullNaab: 'x', semenType: 'CONVENTIONAL', compatibility: 80, pricePerDose: null },
      ],
      totals: { doses: { SEXED: 0, CONVENTIONAL: 1, BEEF: 0 }, cost: 0, avgExpectedProgeny: {} },
    };
    const bull: Bull = {
      naab: 'x',
      name: 'Toro, con coma',
      company: 'Central',
      breed: 'HO',
      profile: null,
      sireNaab: null,
      calvingEase: null,
      semenTypes: ['CONVENTIONAL'],
      pricePerDose: null,
      source: 'test',
    };
    const csv = planToCsv(
      plan,
      new Map([[bull.naab, bull]]),
      new Map([['fem-1', { visualId: '1', tier: 'COMMERCIAL' }]]),
    );
    const dataLine = csv.replace('﻿', '').split('\n')[1];
    expect(dataLine).toBe('1,COMMERCIAL,"Toro, con coma",Central,CONVENTIONAL,80,');
  });
});
