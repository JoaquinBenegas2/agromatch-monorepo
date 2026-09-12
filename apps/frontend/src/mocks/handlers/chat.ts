import { http, HttpResponse } from 'msw';
import { samples } from '@org/shared-types/fixtures';

/** Feature `mvp-a-core` (anexo: chat sobre el rodeo). */
export const chatHandlers = [
  http.post('/api/farms/:farmId/chat', () => HttpResponse.json(samples.chatAnswer)),
];
