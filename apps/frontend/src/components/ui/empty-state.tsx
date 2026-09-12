import * as React from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

function EmptyState({ className, icon, title, description, action, ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10 text-center',
        className,
      )}
      {...props}
    >
      {icon && <div className="mb-1 text-ink-4 [&_svg]:size-8">{icon}</div>}
      <p className="text-[13.5px] font-semibold">{title}</p>
      {description && (
        <p className="max-w-sm text-[11.5px] text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
