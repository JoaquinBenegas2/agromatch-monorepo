import { useState } from 'react';
import { AiExplanation } from '@/components/ui/ai-explanation';
import { ChatBubble, ChatComposer, ChatThread } from '@/components/ui/chat';
import { useAskChat } from '../../shared/api/hooks/use-chat.js';

interface ChatMessage {
  id: string;
  question: string;
  answer?: { text: string; usedTools: string[] };
}

/**
 * D8 (REQ-A-CHAT-03): hilo del chat sobre el rodeo, dentro del panel que
 * reserva `frontend-shell`. La respuesta se muestra con `AiExplanation`
 * para que el indicador `FALLBACK` (cuando `usedTools` viene vacío) sea
 * siempre visible, nunca opcional.
 */
export function ChatThreadPanel({ farmId }: { farmId: string }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { mutate, isPending } = useAskChat(farmId);

  function handleSend() {
    const question = draft.trim();
    if (!question) return;
    const id = `msg-${Date.now()}`;
    setMessages((prev) => [...prev, { id, question }]);
    setDraft('');
    mutate(question, {
      onSuccess: (answer) => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, answer } : m)));
      },
      onError: () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, answer: { text: 'No pude responder esa pregunta ahora.', usedTools: [] } } : m,
          ),
        );
      },
    });
  }

  return (
    <>
      <ChatThread>
        {messages.length === 0 && (
          <p className="text-[12.5px] text-ink-4">
            Preguntá algo sobre el rodeo, por ejemplo: "¿cuántas terneras van a carne?".
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-2">
            <ChatBubble align="end">{message.question}</ChatBubble>
            {message.answer && (
              <AiExplanation
                text={message.answer.text}
                source={message.answer.usedTools.length > 0 ? 'AI' : 'FALLBACK'}
              />
            )}
          </div>
        ))}
      </ChatThread>
      <ChatComposer
        value={draft}
        onValueChange={setDraft}
        onSend={handleSend}
        disabled={isPending}
        placeholder="Preguntá sobre el rodeo…"
      />
    </>
  );
}
