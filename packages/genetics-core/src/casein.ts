import type { CaseinOdds, GenomicProfile } from '@org/shared-types';

function betaA2Share(genotype: GenomicProfile['betaCasein']): number | null {
  switch (genotype) {
    case 'A2/A2':
      return 1;
    case 'A1/A2':
      return 0.5;
    case 'A1/A1':
      return 0;
    default:
      return null;
  }
}

function kappaBShare(genotype: GenomicProfile['kappaCasein']): number | null {
  switch (genotype) {
    case 'BB':
      return 1;
    case 'AB':
    case 'BE':
      return 0.5;
    case 'AA':
    case 'AE':
    case 'EE':
      return 0;
    default:
      return null;
  }
}

/**
 * A2 (RN-04): probabilidad de que la cría sea A2/A2 y BB, asumiendo que cada
 * padre aporta un alelo con 50% de probabilidad (sin ligamiento). Si falta el
 * dato de cualquiera de los dos padres, el valor es `null`, nunca 0.
 */
export function caseinOdds(dam: GenomicProfile, sire: GenomicProfile): CaseinOdds {
  const damBeta = betaA2Share(dam.betaCasein);
  const sireBeta = betaA2Share(sire.betaCasein);
  const damKappa = kappaBShare(dam.kappaCasein);
  const sireKappa = kappaBShare(sire.kappaCasein);

  return {
    betaA2A2: damBeta === null || sireBeta === null ? null : damBeta * sireBeta,
    kappaBB: damKappa === null || sireKappa === null ? null : damKappa * sireKappa,
  };
}
