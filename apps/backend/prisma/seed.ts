import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  bullsSeed,
  capabilities,
  farms,
  herdFarmA,
  herdFarmB,
  herdFarmC,
  providers,
  users,
} from '@org/shared-types/fixtures';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { farmToPrismaData } from '../src/repos/prisma/farm.repo.js';

/**
 * Carga los fixtures de `@org/shared-types/fixtures` (REQ-AK-02). Usa
 * `createMany({ skipDuplicates: true })`: correrlo dos veces deja el mismo
 * estado, sin duplicar filas.
 */
async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  await prisma.user.createMany({ data: users, skipDuplicates: true });
  console.log(`users: ${users.length}`);

  await prisma.farm.createMany({ data: farms.map(farmToPrismaData), skipDuplicates: true });
  console.log(`farms: ${farms.length}`);

  await prisma.bull.createMany({
    data: bullsSeed.map((b) => ({ ...b, profile: b.profile ?? undefined })),
    skipDuplicates: true,
  });
  console.log(`bulls: ${bullsSeed.length}`);

  await prisma.provider.createMany({
    data: providers.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      base: p.base,
      verified: p.verified,
      reputationAvg: p.reputation.avg,
      reputationJobs: p.reputation.jobs,
      contactPhone: p.contact.phone ?? null,
      contactEmail: p.contact.email ?? null,
      source: p.source,
    })),
    skipDuplicates: true,
  });
  console.log(`providers: ${providers.length}`);

  await prisma.capability.createMany({
    data: capabilities.map((c) => ({
      id: c.id,
      providerId: c.providerId,
      category: c.category,
      serviceType: c.serviceType,
      coverageRadiusKm: c.coverageRadiusKm,
      capacityPerDay: c.capacityPerDay ?? undefined,
      availability: c.availability,
      priceModel: c.priceModel,
      priceFrom: c.priceFrom ?? null,
      certifications: c.certifications,
      attributes: c.attributes,
    })),
    skipDuplicates: true,
  });
  console.log(`capabilities: ${capabilities.length}`);

  const allFemales = [...herdFarmA.females, ...herdFarmB.females, ...herdFarmC.females];
  await prisma.female.createMany({
    data: allFemales.map((f) => ({ ...f, profile: f.profile ?? undefined })),
    skipDuplicates: true,
  });
  console.log(`females: ${allFemales.length}`);

  await prisma.$disconnect();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
