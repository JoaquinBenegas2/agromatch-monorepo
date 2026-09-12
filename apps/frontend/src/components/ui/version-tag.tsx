import * as React from 'react';

import { cn } from '@/lib/utils';

function VersionTag({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="version-tag"
      className={cn(
        'inline-flex items-center rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] leading-none font-semibold tracking-wide text-ink-3',
        className,
      )}
      {...props}
    />
  );
}

export { VersionTag };
