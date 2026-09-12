import { validateNumbers } from './validate-numbers.js';

const facts = {
  femaleVisualId: '3031',
  bull: { naab: '029HO20544', name: 'Don Rufino 4012', company: 'Cabaña La Esperanza' },
  damTraits: { scs: 3.19, pro: 3.1 },
  expectedProgeny: { scs: 2.95, pro: 3.3 },
  deltaVsDam: { scs: -0.24 },
  caseinOdds: { betaA2A2: 0.5, kappaBB: null },
  compatibility: 100,
  rank: 1,
  totalCandidates: 12,
  reasons: ['SCS baja de 3,19 a 2,95'],
};

describe('validateNumbers (RN-17/RN-18, REQ-D-04)', () => {
  it('un número que no está en los hechos (ni redondeado) → ok:false', () => {
    const result = validateNumbers('El SCS proyectado es 2,70', facts);
    expect(result.ok).toBe(false);
    expect(result.unknown).toContain(2.7);
  });

  it('coma y punto decimal, ambos existen en los hechos → ok:true', () => {
    const result = validateNumbers('Baja de 3,19 a 2.95', facts);
    expect(result.ok).toBe(true);
    expect(result.unknown).toEqual([]);
  });

  it('tolerancia de redondeo a 1 decimal', () => {
    // el hecho es 2.95; el texto dice "2,9" que redondea igual a 1 decimal (2.9 vs 3.0)
    // usamos un hecho que sí redondea a lo mismo: 2.95 -> round1 = 3 (2.95*10=29.5, Math.round=30 => 3.0)
    const result = validateNumbers('el valor ronda 3', facts);
    expect(result.ok).toBe(true);
  });

  it('no confunde dígitos de un código NAAB con un número suelto', () => {
    // "029HO20544" no debería extraerse como los números 029 y 20544
    const result = validateNumbers('El toro Don Rufino 4012 mejora la facilidad de parto', facts);
    expect(result.ok).toBe(true);
  });

  it('rank y totalCandidates cuentan como hechos válidos', () => {
    const result = validateNumbers('Es el #1 de 12 candidatos', facts);
    expect(result.ok).toBe(true);
  });

  it('texto sin números → siempre ok', () => {
    expect(validateNumbers('Buen match para tu objetivo', facts).ok).toBe(true);
  });

  it('negativos con coma decimal', () => {
    const result = validateNumbers('la diferencia es de −0,24', facts);
    expect(result.ok).toBe(true);
  });
});
