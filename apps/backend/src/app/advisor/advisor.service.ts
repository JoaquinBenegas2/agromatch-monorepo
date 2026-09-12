import { Inject, Injectable } from '@nestjs/common';
import {
  TRAIT_DIRECTION,
  type Farm,
  type FarmSummary,
  type Female,
  type GenomicProfile,
  type Tier,
  type TraitVector,
  type User,
} from '@org/shared-types';
import { CLASSIFICATION_REPO, type ClassificationRepo } from '../../repos/classification.port.js';
import { FARM_REPO, type FarmRepo } from '../../repos/farm.port.js';
import { FEMALE_REPO, type FemaleRepo } from '../../repos/female.port.js';

const TIERS: Tier[] = ['ELITE', 'COMMERCIAL', 'BEEF', 'CULL_ALERT'];
const TRAIT_KEYS = Object.keys(TRAIT_DIRECTION) as Array<keyof TraitVector>;

type FemaleWithProfile = Omit<Female, 'profile'> & { profile: GenomicProfile };

function hasProfile(female: Female): female is FemaleWithProfile {
  return female.profile !== null;
}

function emptyByTier(): Record<Tier, number> {
  return Object.fromEntries(TIERS.map((tier) => [tier, 0])) as Record<Tier, number>;
}

/** Promedia cada rasgo solo sobre las hembras que lo declaran (algunos, como `ci`/`fs`/`rfi`, son opcionales). */
function averageTraits(females: FemaleWithProfile[]): Partial<TraitVector> {
  const result: Partial<TraitVector> = {};
  for (const key of TRAIT_KEYS) {
    let sum = 0;
    let count = 0;
    for (const female of females) {
      const value = female.profile.traits[key];
      if (value === undefined) continue;
      sum += value;
      count += 1;
    }
    if (count > 0) result[key] = sum / count;
  }
  return result;
}

function share(females: FemaleWithProfile[], predicate: (profile: GenomicProfile) => boolean): number {
  if (females.length === 0) return 0;
  return females.filter((female) => predicate(female.profile)).length / females.length;
}

/** `GET /advisor/overview` (REQ-B-ADV-01): un `FarmSummary` por tambo del asesor. */
@Injectable()
export class AdvisorService {
  constructor(
    @Inject(FARM_REPO) private readonly farmRepo: FarmRepo,
    @Inject(FEMALE_REPO) private readonly femaleRepo: FemaleRepo,
    @Inject(CLASSIFICATION_REPO) private readonly classificationRepo: ClassificationRepo,
  ) {}

  async overview(user: User): Promise<FarmSummary[]> {
    const farms = await this.farmRepo.findByIds(user.farmIds);
    return Promise.all(farms.map((farm) => this.summarize(farm)));
  }

  private async summarize(farm: Farm): Promise<FarmSummary> {
    const females = await this.femaleRepo.listByFarm(farm.id);
    const withProfile = females.filter(hasProfile);
    const classification = await this.classificationRepo.listByFarm(farm.id);

    const byTier = emptyByTier();
    for (const item of classification?.items ?? []) byTier[item.tier] += 1;

    return {
      farm,
      total: withProfile.length,
      byTier,
      avgTraits: averageTraits(withProfile),
      a2a2Share: share(withProfile, (profile) => profile.betaCasein === 'A2/A2'),
      bbShare: share(withProfile, (profile) => profile.kappaCasein === 'BB'),
    };
  }
}
