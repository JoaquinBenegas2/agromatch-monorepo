import { useState } from 'react';
import type { ServiceRequestStatus } from '@org/shared-types';
import { CalendarDays, MessageSquareText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatBubble, ChatComposer, ChatThread } from '@/components/ui/chat';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useUser } from '../../shared/user/user-context.js';
import {
  useNegotiations,
  useSendNegotiationMessage,
} from './negotiations.api.js';

const STATUS: Record<ServiceRequestStatus, { label: string; variant: BadgeProps['variant'] }> = {
  SENT: { label: 'Esperando respuesta', variant: 'neutral' },
  ANSWERED: { label: 'Negociando', variant: 'warn' },
  ACCEPTED: { label: 'Respondido', variant: 'ok' },
  DONE: { label: 'Finalizada', variant: 'solid' },
  CANCELLED: { label: 'Cancelado', variant: 'danger' },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function NegotiationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const negotiations = useNegotiations();
  const send = useSendNegotiationMessage();
  const [message, setMessage] = useState('');

  if (negotiations.isLoading) {
    return <div className="grid gap-4 py-6 lg:grid-cols-[280px_1fr]"><Skeleton className="h-[540px]" /><Skeleton className="h-[540px]" /></div>;
  }
  if (negotiations.error) return <ErrorMessage message={negotiations.error.message} />;
  const items = negotiations.data ?? [];
  if (items.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          icon={<MessageSquareText />}
          title="Todavía no hay negociaciones"
          description={user.role === 'PROVIDER' ? 'Las consultas de productores aparecerán acá.' : 'Iniciá una desde un proveedor recomendado en el marketplace.'}
          action={user.role !== 'PROVIDER' ? <Button onClick={() => navigate('/mercado')}>Ir al marketplace</Button> : undefined}
        />
      </div>
    );
  }

  const selected = items.find((item) => item.id === id) ?? items[0];
  const closed = selected.status === 'DONE' || selected.status === 'CANCELLED';
  const ownType = user.role === 'PROVIDER' ? 'PROVIDER' : 'CUSTOMER';

  return (
    <div className="flex flex-col gap-4 py-5 sm:py-7">
      <PageHeader title="Negociaciones y mensajes" description="Conversá con productores y proveedores; el acuerdo se realiza por fuera de AgroMatch." />
      <div className="grid min-h-[580px] gap-4 lg:grid-cols-[290px_minmax(360px,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Conversaciones ({items.length})</CardTitle></CardHeader>
          <div className="divide-y divide-border-soft">
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={cn('w-full px-4 py-3 text-left transition-colors hover:bg-muted', selected.id === item.id && 'bg-secondary')}
                onClick={() => navigate(`/negociacion/matches/${item.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="truncate text-[12.5px]">{user.role === 'PROVIDER' ? item.farmName : item.providerName}</strong>
                  <Badge variant={STATUS[item.status].variant}>{STATUS[item.status].label}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{item.subject}</p>
                <p className="mt-1 text-[10px] text-ink-4">{formatDate(item.updatedAt)}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-[580px] flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>{user.role === 'PROVIDER' ? selected.farmName : selected.providerName}</CardTitle>
            <p className="text-[11.5px] text-muted-foreground">{selected.subject}</p>
          </CardHeader>
          <ChatThread className="min-h-0">
            {selected.messages.map((item) => (
              <ChatBubble key={item.id} align={item.senderType === ownType ? 'end' : 'start'} author={item.senderName} timestamp={formatDate(item.createdAt)}>
                {item.body}
              </ChatBubble>
            ))}
          </ChatThread>
          {send.error ? <div className="px-3"><ErrorMessage message={send.error.message} /></div> : null}
          {closed ? (
            <div className="border-t border-border p-4 text-center text-[11.5px] text-muted-foreground">Esta conversación está cerrada.</div>
          ) : (
            <ChatComposer
              value={message}
              onValueChange={setMessage}
              disabled={send.isPending}
              onSend={() => send.mutate({ id: selected.id, body: { body: message.trim() } }, { onSuccess: () => setMessage('') })}
            />
          )}
        </Card>

        <Card className="lg:col-start-2">
          <CardContent className="flex gap-3 text-[11.5px]">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <div><strong>{selected.farmName}</strong><p className="text-muted-foreground">{selected.category} · conversación iniciada {formatDate(selected.createdAt)}. El acuerdo se coordina por fuera de AgroMatch.</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NegotiationsPage;
