import * as React from 'react';

import { cn } from '@/lib/utils';

function Topbar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="topbar"
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3 sm:px-8 sm:py-4',
        className,
      )}
      {...props}
    />
  );
}

export { Topbar };
