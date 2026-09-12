import type { Request } from 'express';
import type { User } from '@org/shared-types';

export interface AuthenticatedRequest extends Request {
  user: User;
}
