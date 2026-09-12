import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export interface StatCardProps extends React.ComponentProps<typeof Card> {
  label: React.ReactNode;
  value: React.ReactNode;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
}

function StatCard({ className, label, value, meta, icon, ...props }: StatCardProps) {
  return (
    <Card data-slot="stat-card" className={cn('flex flex-col gap-2 p-4', className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9.5px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
          {label}
        </span>
        {icon && <span className="text-ink-3">{icon}</span>}
      </div>
      <span className="text-[27px] leading-none font-bold tracking-tight">{value}</span>
      {meta && <span className="text-[11.5px] text-muted-foreground">{meta}</span>}
    </Card>
  );
}

export { StatCard };
