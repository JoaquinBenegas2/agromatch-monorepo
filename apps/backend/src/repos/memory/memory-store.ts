import { Injectable } from '@nestjs/common';
import type {
  BreedingGoal,
  BreedingPlan,
  Bull,
  Capability,
  Classification,
  Farm,
  Female,
  MappingProposal,
  MatchBoard,
  Need,
  Provider,
  Review,
  ServiceRequest,
  User,
} from '@org/shared-types';
import {
  bullsSeed,
  capabilities as capabilitiesSeed,
  farms as farmsSeed,
  herdFarmA,
  herdFarmB,
  herdFarmC,
  providers as providersSeed,
  users as usersSeed,
} from '@org/shared-types/fixtures';

export interface StoredClassification {
  goal: BreedingGoal;
  items: Classification[];
}

export interface StoredHerdImport {
  farmId: string;
  file: Uint8Array;
  filename: string;
  proposal: MappingProposal;
}

/**
 * Única instancia en memoria para el perfil `PERSISTENCE=memory`
 * (`repos/persistence.ts`). Sembrada en el constructor con los mismos
 * fixtures que `prisma/seed.ts` (REQ-AK-02), para que el perfil en memoria
 * y Postgres arranquen con el mismo estado. Se pierde al reiniciar el
 * proceso: es intencional (docs/qa-config.md §6.2).
 *
 * Registrada como provider normal (no global ni singleton manual): Nest le
 * da una instancia por módulo/testing module, así cada test o cada arranque
 * de la app parte de un seed limpio.
 */
@Injectable()
export class MemoryStore {
  readonly users = new Map<string, User>();
  readonly farms = new Map<string, Farm>();
  readonly females = new Map<string, Female>();
  readonly bulls = new Map<string, Bull>();
  readonly providers = new Map<string, Provider>();
  readonly capabilities = new Map<string, Capability>();
  readonly classifications = new Map<string, StoredClassification>();
  readonly plans = new Map<string, BreedingPlan>();
  readonly needs = new Map<string, Need>();
  readonly matchBoards = new Map<string, MatchBoard>();
  readonly serviceRequests = new Map<string, ServiceRequest>();
  readonly reviews = new Map<string, Review>();
  readonly herdImports = new Map<string, StoredHerdImport>();

  constructor() {
    for (const user of usersSeed) this.users.set(user.id, structuredClone(user));
    for (const farm of farmsSeed) this.farms.set(farm.id, structuredClone(farm));
    for (const bull of bullsSeed) this.bulls.set(bull.naab, structuredClone(bull));
    for (const provider of providersSeed) this.providers.set(provider.id, structuredClone(provider));
    for (const capability of capabilitiesSeed) {
      this.capabilities.set(capability.id, structuredClone(capability));
    }
    const allFemales = [...herdFarmA.females, ...herdFarmB.females, ...herdFarmC.females];
    for (const female of allFemales) this.females.set(female.id, structuredClone(female));
  }
}
