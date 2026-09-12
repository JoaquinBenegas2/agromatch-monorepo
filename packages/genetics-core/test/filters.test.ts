import type { Bull, Farm, Female } from '@org/shared-types';
import { calvingEaseFilter, inbreedingFilter } from '../src/filters.js';

function makeFemale(overrides: Partial<Female> = {}): Female {
  return {
    id: 'f-1',
    farmId: 'farm-a',
    visualId: '1',
    birthDate: '2024-01-01',
    sireNaab: 'sire-1',
    category: 'HEIFER',
    profile: null,
    ...overrides,
  };
}

function makeBull(overrides: Partial<Bull> = {}): Bull {
  return {
    naab: 'bull-1',
    name: 'Toro 1',
    company: 'Central',
    breed: 'HO',
    profile: null,
    sireNaab: null,
    calvingEase: 2,
    semenTypes: ['CONVENTIONAL'],
    pricePerDose: 20,
    source: 'test',
    ...overrides,
  };
}

const farm: Farm = {
  id: 'farm-a',
  name: 'Tambo A',
  location: 'Córdoba',
  tierQuotas: { sexedPct: 25, beefPct: 30 },
  calvingEaseMaxHeifer: 2.5,
  scsGrayZone: { from: 3.1, to: 3.18 },
  plGrayZone: { from: 0, to: 0.2 },
};

describe('inbreedingFilter (RN-05, REQ-A-06)', () => {
  it('el toro es el padre de la hembra -> passed:false con 25%', () => {
    const bull = makeBull({ naab: 'sire-1' });
    const female = makeFemale({ sireNaab: 'sire-1' });
    const result = inbreedingFilter(female, bull);
    expect(result.passed).toBe(false);
    expect(result.detail).toContain('25%');
  });

  it('medio hermano (mismo padre) -> passed:false con 12,5%', () => {
    const bull = makeBull({ naab: 'bull-2', sireNaab: 'grandsire-1' });
    const female = makeFemale({ sireNaab: 'grandsire-1' });
    const result = inbreedingFilter(female, bull);
    expect(result.passed).toBe(false);
    expect(result.detail).toContain('medio hermano');
    expect(result.detail).toContain('12,5%');
  });

  it('hembra sin padre registrado -> passed:true, avisa que no se pudo controlar', () => {
    const female = makeFemale({ sireNaab: null });
    const result = inbreedingFilter(female, makeBull());
    expect(result.passed).toBe(true);
    expect(result.detail).toContain('no se pudo controlar');
  });

  it('sin relación -> passed:true', () => {
    const female = makeFemale({ sireNaab: 'other-sire' });
    const result = inbreedingFilter(female, makeBull({ naab: 'bull-3', sireNaab: 'another-sire' }));
    expect(result.passed).toBe(true);
  });
});

describe('calvingEaseFilter (RN-06, REQ-A-06)', () => {
  it('HEIFER con calvingEase > máximo del tambo -> passed:false', () => {
    const heifer = makeFemale({ category: 'HEIFER' });
    const result = calvingEaseFilter(heifer, makeBull({ calvingEase: 3.1 }), farm);
    expect(result.passed).toBe(false);
  });

  it('HEIFER con toro sin dato de calvingEase -> passed:false, avisa que falta el dato', () => {
    const heifer = makeFemale({ category: 'HEIFER' });
    const result = calvingEaseFilter(heifer, makeBull({ calvingEase: null }), farm);
    expect(result.passed).toBe(false);
    expect(result.detail.toLowerCase()).toContain('dato');
  });

  it('CALF con toro de parto difícil -> passed:false', () => {
    const calf = makeFemale({ category: 'CALF' });
    const result = calvingEaseFilter(calf, makeBull({ calvingEase: 3.1 }), farm);
    expect(result.passed).toBe(false);
  });

  it('HEIFER con toro dentro del máximo -> passed:true', () => {
    const heifer = makeFemale({ category: 'HEIFER' });
    const result = calvingEaseFilter(heifer, makeBull({ calvingEase: 2 }), farm);
    expect(result.passed).toBe(true);
  });

  it('COW siempre pasa', () => {
    const cow = makeFemale({ category: 'COW' });
    const result = calvingEaseFilter(cow, makeBull({ calvingEase: 6 }), farm);
    expect(result.passed).toBe(true);
  });
});
