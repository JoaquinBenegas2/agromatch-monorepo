import { useMutation } from '@tanstack/react-query';
import { ChatAnswerSchema, type ChatAnswer } from '@org/shared-types';
import { api } from '../client.js';

/** C6/D8: `POST /farms/:farmId/chat` (anexo del chat sobre el rodeo). */
export function useAskChat(farmId: string) {
  return useMutation<ChatAnswer, Error, string>({
    mutationFn: (question: string) => api.post(`/farms/${farmId}/chat`, { question }, ChatAnswerSchema),
  });
}
