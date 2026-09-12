import { herdFarmA } from '@org/shared-types/fixtures';
import type { TraitStats } from '@org/shared-types';
import { computeTraitStats, expectedProgeny, normalize } from '../src/traits.js';

describe('expectedProgeny (RN-02, REQ-A-04)', () => {
  it('promedia madre y padre por rasgo', () => {
    const dam = { ci: 500, milk: 699, fat: 1, pro: 20, pl: 1, scs: 3, fs: 0, rfi: 4 };
    const sire = { ci: 500, milk: -100, fat: 1, pro: 20, pl: 1, scs: 3, fs: 0, rfi: 4 };
    expect(expectedProgeny(dam, sire).milk).toBe(299.5);
  });
});

describe('normalize (RN-03, REQ-A-04)', () => {
  const stats: TraitStats = {
    mean: { ci: 0, milk: 0, fat: 0, pro: 0, pl: 0, scs: 3.0, fs: 0, rfi: 0 },
    std: { ci: 0, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0.2, fs: 0, rfi: 50 },
  };

  it('invierte el signo en scs y rfi (menos es mejor)', () => {
    expect(normalize(2.8, 'scs', stats)).toBeCloseTo(1);
    expect(normalize(-50, 'rfi', { ...stats, mean: { ...stats.mean, rfi: 0 } })).toBeCloseTo(1);
    expect(normalize(3.2, 'scs', stats)).toBeCloseTo(-1);
  });

  it('devuelve 0 si el desvío es 0', () => {
    const zeroStd: TraitStats = {
      mean: { ci: 500, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0, fs: 0, rfi: 0 },
      std: { ci: 0, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0, fs: 0, rfi: 0 },
    };
    expect(normalize(600, 'ci', zeroStd)).toBe(0);
  });
});

describe('computeTraitStats sobre el rodeo real (REQ-A-04)', () => {
  it('mean.ci ≈ 412.9 ± 0.1', () => {
    const profiles = herdFarmA.females.filter((f) => f.profile !== null).map((f) => f.profile!);
    const stats = computeTraitStats(profiles);
    expect(stats.mean.ci).toBeGreaterThan(412.8);
    expect(stats.mean.ci).toBeLessThan(413.0);
  });
});
