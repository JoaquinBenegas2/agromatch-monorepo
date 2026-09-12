import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CowLoaderProps extends React.ComponentProps<'div'> {
  label?: string;
}

/** Flat bovine silhouette with a gentle walking cycle. */
function CowLoader({
  className,
  label = 'Buscando soluciones para tu necesidad…',
  ...props
}: CowLoaderProps) {
  return (
    <div
      data-slot="cow-loader"
      role="status"
      aria-label={label}
      className={cn(
        'flex w-full flex-1 flex-col items-center justify-center gap-5 py-16',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-4" aria-hidden="true">
        <div className="cow-loader-body">
          <svg
            viewBox="0 0 160 104"
            className="h-[109px] w-[168px] text-primary"
            fill="none"
            focusable="false"
          >
            {/* Far legs and tail share a quiet secondary tone. */}
            <path
              d="M58 62H68L65 92H58Z"
              fill="var(--muted-foreground)"
              className="cow-loader-leg cow-loader-leg-back"
              style={{ transformOrigin: '63px 62px' }}
            />
            <path
              d="M113 62H123L127 92H120Z"
              fill="var(--muted-foreground)"
              className="cow-loader-leg"
              style={{ transformOrigin: '118px 62px' }}
            />
            <g className="cow-loader-tail">
              <path
                d="M131 39C142 42 137 60 143 69"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M142 65Q150 70 146 78Q138 75 142 65Z"
                fill="currentColor"
              />
            </g>

            <path
              d="M50 61H64L56 92H47Z"
              fill="currentColor"
              className="cow-loader-leg"
              style={{ transformOrigin: '57px 61px' }}
            />
            <path
              d="M120 62H133L128 92H119Z"
              fill="currentColor"
              className="cow-loader-leg cow-loader-leg-back"
              style={{ transformOrigin: '126px 62px' }}
            />

            {/* A single flat profile keeps the silhouette legible at small sizes. */}
            <path
              d="M36 30L49 36H117Q133 36 133 51V62Q133 69 120 69H64L50 61L40 47L34 57Q32 61 27 60L15 56Q11 54 14 49L23 35L25 27Z"
              fill="currentColor"
            />
            <path
              d="M28 30Q22 25 26 17L33 28Z"
              fill="var(--muted-foreground)"
            />
            <path d="M35 31Q41 22 49 27Q46 36 37 36Z" fill="currentColor" />

            {/* Broad markings replace the cartoon spots and outlined features. */}
            <path
              d="M64 36H86L81 46Q79 50 74 50H69Q63 50 62 45Z"
              fill="var(--secondary)"
            />
            <path
              d="M101 69L98 61Q96 54 102 51L109 48Q116 46 120 53L123 59L120 69Z"
              fill="var(--secondary)"
            />
            <path
              d="M17 44L31 50L27 60L15 56Q11 54 14 49Z"
              fill="var(--secondary)"
            />
            <circle cx="29" cy="39" r="1.5" fill="var(--secondary)" />
            <path d="M91 69H107L104 75H95Z" fill="currentColor" />
          </svg>
        </div>
        <div className="h-0.5 w-20 rounded-full bg-secondary" />
      </div>

      <p className="max-w-sm px-4 text-center text-[15px] font-medium leading-relaxed text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export { CowLoader };
