import { Injectable } from '@nestjs/common';
import type { Capability, NeedCategory, Provider } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { ProviderRepo } from '../provider.port.js';

@Injectable()
export class InMemoryProviderRepo implements ProviderRepo {
  constructor(private readonly store: MemoryStore) {}

  async list(filter?: { category?: NeedCategory }): Promise<Provider[]> {
    if (!filter?.category) {
      return [...this.store.providers.values()].map((p) => structuredClone(p));
    }
    const providerIds = new Set<string>();
    for (const capability of this.store.capabilities.values()) {
      if (capability.category === filter.category) providerIds.add(capability.providerId);
    }
    const result: Provider[] = [];
    for (const provider of this.store.providers.values()) {
      if (providerIds.has(provider.id)) result.push(structuredClone(provider));
    }
    return result;
  }

  async findById(id: string): Promise<Provider | null> {
    const provider = this.store.providers.get(id);
    return provider ? structuredClone(provider) : null;
  }

  async listCapabilities(filter?: { category?: NeedCategory }): Promise<Capability[]> {
    const result: Capability[] = [];
    for (const capability of this.store.capabilities.values()) {
      if (filter?.category && capability.category !== filter.category) continue;
      result.push(structuredClone(capability));
    }
    return result;
  }

  async updateReputation(id: string, reputation: Provider['reputation']): Promise<Provider> {
    const provider = this.store.providers.get(id);
    if (!provider) throw new Error(`Provider not found: ${id}`);
    const updated: Provider = { ...provider, reputation: structuredClone(reputation) };
    this.store.providers.set(id, updated);
    return structuredClone(updated);
  }
}
