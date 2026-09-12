import * as React from 'react';

import { cn } from '@/lib/utils';

export interface FilterChip {
  value: string;
  label: React.ReactNode;
  count?: number;
}

export interface FilterChipsProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  chips: FilterChip[];
  value: string[];
  onValueChange: (value: string[]) => void;
  /** false = un solo chip activo a la vez (como tabs). true = multi-selección. */
  multiple?: boolean;
}

/** ChipsFiltro: tier, etiqueta o categoría. Usado en tablero del rodeo, swipe y resultados. */
function FilterChips({ className, chips, value, onValueChange, multiple = true, ...props }: FilterChipsProps) {
  function toggle(chipValue: string) {
    const isActive = value.includes(chipValue);
    if (!multiple) {
      onValueChange(isActive ? [] : [chipValue]);
      return;
    }
    onValueChange(isActive ? value.filter((v) => v !== chipValue) : [...value, chipValue]);
  }

  return (
    <div
      data-slot="filter-chips"
      role="group"
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      {...props}
    >
      {chips.map((chip) => {
        const active = value.includes(chip.value);
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(chip.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors',
              active
                ? 'border-primary bg-accent text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span className={cn('text-[10px]', active ? 'text-primary' : 'text-ink-4')}>
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { FilterChips };
