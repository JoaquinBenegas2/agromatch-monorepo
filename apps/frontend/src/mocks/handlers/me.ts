import { http, HttpResponse } from 'msw';
import { farms, users } from '@org/shared-types/fixtures';
import type { ApiError, MeResponse } from '@org/shared-types';

/**
 * REQ-FS-04: los mocks devuelven el mismo formato de error que el backend
 * real, incluyendo 401 sin `x-user-id` y 404 si el usuario no existe.
 */
export const meHandlers = [
  http.get('/api/me', ({ request }) => {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      const error: ApiError = {
        code: 'USER_HEADER_MISSING',
        message: 'Falta el header x-user-id: elegí un usuario',
        details: {},
      };
      return HttpResponse.json(error, { status: 401 });
    }

    const user = users.find((u) => u.id === userId);
    if (!user) {
      const error: ApiError = { code: 'USER_NOT_FOUND', message: 'El usuario no existe', details: {} };
      return HttpResponse.json(error, { status: 401 });
    }

    const response: MeResponse = {
      user,
      farms: farms.filter((f) => user.farmIds.includes(f.id)),
    };
    return HttpResponse.json(response);
  }),
];
