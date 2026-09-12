import type { BreedingGoal, Classification, Farm, Female, GenomicProfile, SemenType, Tag, Tier, TraitKey } from '@org/shared-types';

type ProfiledFemale = Female & { profile: GenomicProfile };
const add = <T>(items: T[], item: T) => { if (!items.includes(item)) items.push(item); };
const ranked = (females: Female[]) => females.filter((f): f is ProfiledFemale => f.profile !== null).sort((a, b) => (b.profile.traits.ci ?? 0) - (a.profile.traits.ci ?? 0) || a.visualId.localeCompare(b.visualId) || a.id.localeCompare(b.id));
const percentile = (index: number, total: number) => total <= 1 ? 100 : Math.round((100 * (total - 1 - index)) / (total - 1));
const semen = (tier: Tier): SemenType | null => tier === 'CULL_ALERT' ? null : tier === 'ELITE' ? 'SEXED' : tier === 'BEEF' ? 'BEEF' : 'CONVENTIONAL';

/** RN-07 through RN-12. Classification is deterministic and farm-local. */
export function classifyHerd(females: Female[], farm: Farm, goal: BreedingGoal): Classification[] {
  const animals = ranked(females); const n = animals.length;
  const elite = Math.min(Math.round(n * farm.tierQuotas.sexedPct / 100), n);
  const beef = Math.min(Math.round(n * farm.tierQuotas.beefPct / 100), n - elite);
  return animals.map((female, index) => {
    const t = female.profile.traits; const tags: Tag[] = []; const corrective: TraitKey[] = [];
    const reasons = [`CI en el percentil ${percentile(index, n)} del tambo`];
    let tier: Tier = index < elite ? 'ELITE' : index >= n - beef ? 'BEEF' : 'COMMERCIAL';
    const scsRisk = t.scs > farm.scsGrayZone.to, scsGray = t.scs >= farm.scsGrayZone.from && t.scs <= farm.scsGrayZone.to;
    if (scsRisk || scsGray) { add(corrective, 'scs'); if (scsRisk) { add(tags, 'MASTITIS_RISK'); reasons.push(`SCS ${t.scs.toFixed(2)} supera el umbral de riesgo`); if (tier === 'ELITE') tier = 'COMMERCIAL'; } else reasons.push(`SCS ${t.scs.toFixed(2)} dentro de zona gris`); }
    const plRisk = t.pl < farm.plGrayZone.from, plGray = t.pl >= farm.plGrayZone.from && t.pl <= farm.plGrayZone.to;
    if (plRisk || plGray) { add(corrective, 'pl'); if (plRisk) { add(tags, 'SHORT_LIFE'); reasons.push(`PL ${t.pl.toFixed(2)} está por debajo del umbral de riesgo`); if (tier === 'ELITE') tier = 'COMMERCIAL'; } else reasons.push(`PL ${t.pl.toFixed(2)} dentro de zona gris`); }
    const protectedByGoal = (goal.wantBetaA2 && female.profile.betaCasein === 'A2/A2') || (goal.wantKappaBB && female.profile.kappaCasein === 'BB');
    if (tier === 'BEEF' && protectedByGoal) { tier = 'COMMERCIAL'; add(tags, 'GOAL_PROTECTED'); reasons.push('Protegida de carne por el objetivo de caseínas'); }
    if (percentile(index, n) <= 5 && t.pl < -0.5 && t.scs > 3.2 && (t.rfi ?? 0) > 50) { tier = 'CULL_ALERT'; reasons.push('Alerta de descarte: CI bajo, PL bajo, SCS alto y RFI alto'); }
    if (female.profile.betaCasein === 'A2/A2') add(tags, 'A2_NUCLEUS');
    if (female.profile.kappaCasein === 'BB') add(tags, 'CHEESE_BB');
    if (female.sireNaab === null) { add(tags, 'NO_SIRE'); reasons.push('Sin padre registrado'); }
    return { femaleId: female.id, tier, semenType: semen(tier), ciPercentile: percentile(index, n), tags, corrective, reasons };
  });
}

/** Reconstructed market rules, used only for the pitch comparison. */
export function classifyHerdClassic(females: Female[]): Classification[] {
  const animals = ranked(females);
  return animals.map((female, index) => {
    const t = female.profile.traits;
    const isBeef = (t.ci ?? 0) < 355 || t.scs > 3.15 || t.fat < 0 || t.pro < 0;
    const isElite = !isBeef && (t.ci ?? 0) > 480 && t.pro > 0 && t.fat > 0 && t.scs < 3;
    const tier: Tier = isBeef ? 'BEEF' : isElite ? 'ELITE' : 'COMMERCIAL';
    return { femaleId: female.id, tier, semenType: semen(tier), ciPercentile: percentile(index, animals.length), tags: female.sireNaab === null ? ['NO_SIRE'] : [], corrective: [], reasons: [isBeef ? 'Regla clásica: condición de carne' : isElite ? 'Regla clásica: condiciones de sexado' : 'Regla clásica: convencional'] };
  });
}
