import { MessageCircle, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ChatThreadPanel } from '../../features/chat/chat-thread-panel.js';
import { useActiveFarmId } from '../../shared/user/user-context.js';

/**
 * REQ-FS-09: panel lateral del chat, colapsado por defecto, solo visible en
 * `/motor-genetico/*`. Lo llena `mvp-a-core` (anexo: C6+B7+D8) con
 * `ChatThreadPanel`; sin tambo activo todavía, muestra el `EmptyState`.
 */
export function useChatPanelVisibility() {
  const { pathname } = useLocation();
  return pathname.startsWith('/motor-genetico');
}

export function ChatToggleButton({ onClick }: { onClick: () => void }) {
  const visible = useChatPanelVisibility();
  if (!visible) return null;
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="Abrir chat sobre el rodeo">
      <MessageCircle />
    </Button>
  );
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const visible = useChatPanelVisibility();
  const [farmId] = useActiveFarmId();
  if (!visible || !open) return null;

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <span className="text-[12.5px] font-semibold">Chat sobre el rodeo</span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar chat">
          <X />
        </Button>
      </div>
      {farmId ? (
        <ChatThreadPanel farmId={farmId} />
      ) : (
        <div className="p-4">
          <EmptyState
            icon={<MessageCircle />}
            title="Elegí un establecimiento"
            description="El chat necesita un tambo activo."
          />
        </div>
      )}
    </aside>
  );
}
