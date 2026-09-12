import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-3', className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex max-w-full w-fit items-center gap-1.5 overflow-x-auto',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full border border-transparent px-3.5 py-2 text-[11.5px] font-medium text-muted-foreground outline-none transition-colors',
        "before:size-1 before:shrink-0 before:scale-0 before:rounded-full before:bg-primary before:transition-transform before:content-['']",
        'hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring/30',
        'data-[state=active]:border-secondary-border data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:before:scale-100',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
