import type { ServiceRequest } from '@org/shared-types';

export interface ServiceRequestRepo {
  create(r: ServiceRequest): Promise<ServiceRequest>;
  findById(id: string): Promise<ServiceRequest | null>;
}

export const SERVICE_REQUEST_REPO = Symbol('SERVICE_REQUEST_REPO');
