import { Inject, Injectable } from '@nestjs/common';
import { classifyHerd, classifyHerdClassic } from '@org/genetics-core';
import type { BreedingGoal, Classification, ClassificationSummary } from '@org/shared-types';
import { DomainError } from '../common/errors/domain-error.js';
import { CLASSIFICATION_REPO, type ClassificationRepo } from '../repos/classification.port.js';
import { FARM_REPO, type FarmRepo } from '../repos/farm.port.js';
import { FEMALE_REPO, type FemaleRepo } from '../repos/female.port.js';
const tiers = ['ELITE', 'COMMERCIAL', 'BEEF', 'CULL_ALERT'] as const;
const tags = ['A2_NUCLEUS', 'CHEESE_BB', 'MASTITIS_RISK', 'SHORT_LIFE', 'NO_SIRE', 'GOAL_PROTECTED'] as const;
@Injectable() export class ClassificationService {
  constructor(@Inject(FEMALE_REPO) private readonly females: FemaleRepo, @Inject(FARM_REPO) private readonly farms: FarmRepo, @Inject(CLASSIFICATION_REPO) private readonly classifications: ClassificationRepo) {}
  async classify(farmId: string, goal: BreedingGoal): Promise<Classification[]> { const [farm, females] = await Promise.all([this.farms.findById(farmId), this.females.listByFarm(farmId)]); if (!farm) throw new DomainError('FARM_NOT_FOUND', 'No se encontró el tambo', 404); const items = classifyHerd(females, farm, goal); if (!items.length) throw new DomainError('HERD_EMPTY', 'El rodeo no tiene hembras con perfil', 409); await this.classifications.replaceForFarm(farmId, goal, items); return items; }
  async summary(farmId: string): Promise<ClassificationSummary> { const [stored, females] = await Promise.all([this.classifications.listByFarm(farmId), this.females.listByFarm(farmId)]); if (!stored) throw new DomainError('HERD_NOT_CLASSIFIED', 'El rodeo todavía no fue clasificado', 409); const byTier = Object.fromEntries(tiers.map((tier) => [tier, 0])) as ClassificationSummary['byTier']; const byTag = Object.fromEntries(tags.map((tag) => [tag, 0])) as ClassificationSummary['byTag']; for (const item of stored.items) { byTier[item.tier] += 1; for (const tag of item.tags) byTag[tag] += 1; } return { byTier, byTag, total: stored.items.length, withoutProfile: females.filter((female) => female.profile === null).length, classicRulesBeefCount: classifyHerdClassic(females).filter((item) => item.tier === 'BEEF').length }; }
}
