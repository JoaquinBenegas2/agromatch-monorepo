import type { GenomicProfile } from '@org/shared-types';
import { caseinOdds } from '../src/casein.js';

function profile(betaCasein: GenomicProfile['betaCasein'], kappaCasein: GenomicProfile['kappaCasein']): GenomicProfile {
  return {
    traits: { ci: 0, milk: 0, fat: 0, pro: 0, pl: 0, scs: 0, fs: 0, rfi: 0 },
    betaCasein,
    kappaCasein,
    scale: 'CDCB',
    source: 'test',
  };
}

describe('caseinOdds (RN-04, REQ-A-05)', () => {
  it('beta caseína: probabilidad mendeliana de A2/A2', () => {
    expect(caseinOdds(profile('A2/A2', null), profile('A2/A2', null)).betaA2A2).toBe(1);
    expect(caseinOdds(profile('A1/A2', null), profile('A2/A2', null)).betaA2A2).toBe(0.5);
    expect(caseinOdds(profile('A1/A2', null), profile('A1/A2', null)).betaA2A2).toBe(0.25);
    expect(caseinOdds(profile('A1/A1', null), profile('A2/A2', null)).betaA2A2).toBe(0);
  });

  it('kappa caseína: probabilidad mendeliana de BB', () => {
    expect(caseinOdds(profile(null, 'AB'), profile(null, 'BB')).kappaBB).toBe(0.5);
    expect(caseinOdds(profile(null, 'BE'), profile(null, 'BB')).kappaBB).toBe(0.5);
    expect(caseinOdds(profile(null, 'EE'), profile(null, 'BB')).kappaBB).toBe(0);
  });

  it('dato faltante en cualquiera de los padres -> null, nunca 0', () => {
    const dam = profile(null, 'AB');
    const sire = profile('A2/A2', 'BB');
    const odds = caseinOdds(dam, sire);
    expect(odds.betaA2A2).toBeNull();
    expect(odds.kappaBB).toBe(0.5);
  });
});
