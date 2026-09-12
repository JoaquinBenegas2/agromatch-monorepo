import * as React from 'react';
import { Send } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function ChatThread({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="chat-thread"
      className={cn(
        'flex flex-1 flex-col gap-3 overflow-y-auto p-4',
        className,
      )}
      {...props}
    />
  );
}

export interface ChatBubbleProps extends React.ComponentProps<'div'> {
  align?: 'start' | 'end';
  author?: React.ReactNode;
  timestamp?: React.ReactNode;
}

function ChatBubble({
  className,
  align = 'start',
  author,
  timestamp,
  children,
  ...props
}: ChatBubbleProps) {
  const isEnd = align === 'end';
  return (
    <div
      data-slot="chat-bubble"
      className={cn(
        'flex flex-col gap-1',
        isEnd ? 'items-end' : 'items-start',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'max-w-[90%] [overflow-wrap:anywhere] sm:max-w-[70%] rounded-lg px-3 py-2 text-[13px] leading-relaxed',
          isEnd
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {children}
      </div>
      {(author || timestamp) && (
        <span className="px-0.5 text-[10.5px] text-ink-4">
          {[author, timestamp].filter(Boolean).join(' · ')}
        </span>
      )}
    </div>
  );
}

export interface ChatComposerProps extends Omit<
  React.ComponentProps<'form'>,
  'onSubmit'
> {
  value: string;
  onValueChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

function ChatComposer({
  className,
  value,
  onValueChange,
  onSend,
  placeholder = 'Escribí un mensaje…',
  disabled,
  ...props
}: ChatComposerProps) {
  return (
    <form
      data-slot="chat-composer"
      className={cn(
        'flex items-end gap-2 border-t border-border bg-card p-3',
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) onSend();
      }}
      {...props}
    >
      <Textarea
        rows={1}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-9 resize-none"
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (value.trim()) onSend();
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !value.trim()}
        aria-label="Enviar mensaje"
      >
        <Send />
      </Button>
    </form>
  );
}

export { ChatThread, ChatBubble, ChatComposer };
