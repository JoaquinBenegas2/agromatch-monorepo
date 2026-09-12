import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@org/shared-types';
import type { AuthenticatedRequest } from './request.types.js';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});
