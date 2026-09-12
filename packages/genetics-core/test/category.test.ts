import { deriveCategory } from '../src/category.js';

describe('deriveCategory (REQ-A-04)', () => {
  it('11 meses -> CALF, 12 -> HEIFER, 30 -> HEIFER, 31 -> COW', () => {
    expect(deriveCategory('2025-10-12', '2026-09-12')).toBe('CALF'); // 11 meses
    expect(deriveCategory('2025-09-12', '2026-09-12')).toBe('HEIFER'); // 12 meses
    expect(deriveCategory('2024-03-12', '2026-09-12')).toBe('HEIFER'); // 30 meses
    expect(deriveCategory('2024-02-12', '2026-09-12')).toBe('COW'); // 31 meses
  });
});
