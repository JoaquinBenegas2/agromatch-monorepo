import { Injectable } from '@nestjs/common';
import type { ServiceRequest } from '@org/shared-types';
import { MemoryStore } from './memory-store.js';
import type { ServiceRequestRepo } from '../service-request.port.js';

@Injectable()
export class InMemoryServiceRequestRepo implements ServiceRequestRepo {
  constructor(private readonly store: MemoryStore) {}

  async create(r: ServiceRequest): Promise<ServiceRequest> {
    const stored = structuredClone(r);
    this.store.serviceRequests.set(stored.id, stored);
    return structuredClone(stored);
  }

  async findById(id: string): Promise<ServiceRequest | null> {
    const request = this.store.serviceRequests.get(id);
    return request ? structuredClone(request) : null;
  }
}
