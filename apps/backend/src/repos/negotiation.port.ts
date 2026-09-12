import type {
  NegotiationMessage,
  ServiceRequest,
  ServiceRequestStatus,
} from '@org/shared-types';
export interface NegotiationRecord extends ServiceRequest {
  messages: NegotiationMessage[];
}
export interface NegotiationRepo {
  list(filter: {
    providerId?: string;
    needIds?: string[];
  }): Promise<NegotiationRecord[]>;
  findById(id: string): Promise<NegotiationRecord | null>;
  append(
    id: string,
    message: Omit<NegotiationMessage, 'id' | 'createdAt' | 'serviceRequestId'>,
    status: ServiceRequestStatus,
  ): Promise<void>;
}
export const NEGOTIATION_REPO = Symbol('NEGOTIATION_REPO');
