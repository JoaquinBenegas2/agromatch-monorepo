import type { Capability, NeedCategory, Provider } from '@org/shared-types';

export interface ProviderRepo {
  list(filter?: { category?: NeedCategory }): Promise<Provider[]>;
  findById(id: string): Promise<Provider | null>;
  listCapabilities(filter?: { category?: NeedCategory }): Promise<Capability[]>;
  updateReputation(id: string, reputation: Provider['reputation']): Promise<Provider>;
}

export const PROVIDER_REPO = Symbol('PROVIDER_REPO');
