import * as React from 'react';

import { cn } from '@/lib/utils';

function Topbar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="topbar"
      className={cn(
        'flex items-center justify-between border-b border-border bg-card px-8 py-4',
        className,
      )}
      {...props}
    />
  );
}

export { Topbar };
