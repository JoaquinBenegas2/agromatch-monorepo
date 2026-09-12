import type { Bull, Farm, Female, FilterResult } from '@org/shared-types';

/**
 * A3 (RN-05): hija directa (25% de consanguinidad) o medio hermanos por el
 * mismo padre (12,5%). Una hembra sin padre registrado no se puede controlar
 * (RN-24) y pasa, pero avisa.
 */
export function inbreedingFilter(female: Female, bull: Bull): FilterResult {
  if (female.sireNaab === null) {
    return {
      rule: 'RN-05',
      passed: true,
      detail: 'La hembra no tiene padre registrado: no se pudo controlar la consanguinidad',
    };
  }
  if (female.sireNaab === bull.naab) {
    return {
      rule: 'RN-05',
      passed: false,
      detail: 'El toro es el padre de la hembra: la cría tendría 25% de consanguinidad',
    };
  }
  if (bull.sireNaab !== null && bull.sireNaab === female.sireNaab) {
    return {
      rule: 'RN-05',
      passed: false,
      detail: 'La hembra y el toro son medio hermanos (mismo padre): 12,5% de consanguinidad',
    };
  }
  return { rule: 'RN-05', passed: true, detail: 'Sin riesgo de consanguinidad detectado' };
}

/**
 * A3 (RN-06): una vaquillona o una cría con un toro de parto difícil (o sin
 * el dato) no pasa. Una vaca adulta siempre pasa.
 */
export function calvingEaseFilter(female: Female, bull: Bull, farm: Farm): FilterResult {
  if (female.category !== 'HEIFER' && female.category !== 'CALF') {
    return { rule: 'RN-06', passed: true, detail: 'No aplica: la hembra ya es vaca adulta' };
  }
  if (bull.calvingEase === null) {
    return {
      rule: 'RN-06',
      passed: false,
      detail: 'El toro no declara facilidad de parto: falta el dato para una vaquillona o cría',
    };
  }
  const passed = bull.calvingEase <= farm.calvingEaseMaxHeifer;
  return {
    rule: 'RN-06',
    passed,
    detail: passed
      ? `Facilidad de parto ${bull.calvingEase} dentro del máximo ${farm.calvingEaseMaxHeifer} para vaquillonas`
      : `Facilidad de parto ${bull.calvingEase} supera el máximo ${farm.calvingEaseMaxHeifer} para vaquillonas`,
  };
}
