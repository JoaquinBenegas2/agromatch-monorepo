import * as React from 'react';
import { Bot, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type AiExplanationSource = 'AI' | 'FALLBACK';

export interface AiExplanationProps extends React.ComponentProps<'div'> {
  text: React.ReactNode;
  source: AiExplanationSource;
}

/**
 * ExplicacionIA. La IA nunca produce los números: solo redacta a partir de
 * los hechos del motor (RN-17/RN-18). Por eso el indicador de origen es
 * obligatorio y siempre visible, nunca opcional ni oculto en un tooltip.
 * `FALLBACK` es el texto determinístico que se muestra cuando la IA no
 * está disponible o el texto generado no valida contra los hechos.
 */
function AiExplanation({ className, text, source, ...props }: AiExplanationProps) {
  return (
    <div
      data-slot="ai-explanation"
      className={cn('flex items-start gap-2 rounded-md bg-muted p-3 text-[12.5px] leading-relaxed', className)}
      {...props}
    >
      <p className="flex-1 text-foreground">{text}</p>
      <Badge variant={source === 'AI' ? 'ok' : 'neutral'} className="shrink-0">
        {source === 'AI' ? <Bot className="size-3" /> : <Zap className="size-3" />}
        {source}
      </Badge>
    </div>
  );
}

export { AiExplanation };
