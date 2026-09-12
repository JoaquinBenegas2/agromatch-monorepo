import { MessageCircle, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * REQ-FS-09: panel lateral del chat, colapsado por defecto, solo visible en
 * `/motor-genetico/*`. Hasta que `mvp-a-core` lo llene, muestra un
 * `EmptyState` "Chat · pendiente".
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
  if (!visible || !open) return null;

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold">Chat sobre el rodeo</span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar chat">
          <X />
        </Button>
      </div>
      <EmptyState
        icon={<MessageCircle />}
        title="Chat · pendiente"
        description="Lo completa mvp-a-core."
      />
    </aside>
  );
}
