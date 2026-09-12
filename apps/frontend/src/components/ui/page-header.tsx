import * as React from 'react';

import { cn } from '@/lib/utils';

interface PageHeaderProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

function PageHeader({
  className,
  title,
  description,
  actions,
  ...props
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn(
        'flex flex-col items-start justify-between gap-4 sm:flex-row',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <h1 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex max-w-full flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export { PageHeader };
