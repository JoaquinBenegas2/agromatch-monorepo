import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CowLoaderProps extends React.ComponentProps<'div'> {
  label?: string;
}

/**
 * Loader temático: una vaquita flat design caminando mientras se resuelve la
 * búsqueda. Placeholder simple a propósito (RN: nada 3D todavía); pensado
 * para reemplazarse por una versión 3D más adelante.
 */
function CowLoader({ className, label = 'Buscando soluciones para tu necesidad…', ...props }: CowLoaderProps) {
  return (
    <div
      data-slot="cow-loader"
      role="status"
      aria-label={label}
      className={cn('flex flex-col items-center justify-center gap-4 py-16', className)}
      {...props}
    >
      <div className="relative h-24 w-28 animate-bounce [animation-duration:1.1s]">
        <svg viewBox="0 0 120 100" className="h-full w-full" aria-hidden="true">
          {/* patas */}
          <rect x="30" y="70" width="8" height="18" rx="3" fill="#3f3a36" className="origin-top animate-[cow-leg_0.55s_ease-in-out_infinite]" />
          <rect x="82" y="70" width="8" height="18" rx="3" fill="#3f3a36" className="origin-top animate-[cow-leg_0.55s_ease-in-out_infinite_0.28s]" />
          <rect x="46" y="72" width="8" height="16" rx="3" fill="#5a5450" className="origin-top animate-[cow-leg_0.55s_ease-in-out_infinite_0.28s]" />
          <rect x="66" y="72" width="8" height="16" rx="3" fill="#5a5450" className="origin-top animate-[cow-leg_0.55s_ease-in-out_infinite]" />

          {/* cola */}
          <path d="M100 45 q14 4 10 20" stroke="#f4f1ea" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="110" cy="65" r="4" fill="#3f3a36" />

          {/* cuerpo */}
          <ellipse cx="62" cy="55" rx="40" ry="24" fill="#f4f1ea" stroke="#2f2b28" strokeWidth="2.5" />
          <ellipse cx="46" cy="48" rx="8" ry="6" fill="#2f2b28" />
          <ellipse cx="72" cy="62" rx="10" ry="7" fill="#2f2b28" />
          <ellipse cx="90" cy="46" rx="6" ry="5" fill="#2f2b28" />

          {/* cabeza */}
          <g>
            <ellipse cx="24" cy="42" rx="19" ry="16" fill="#f4f1ea" stroke="#2f2b28" strokeWidth="2.5" />
            {/* orejas */}
            <ellipse cx="10" cy="28" rx="6" ry="4" fill="#f4f1ea" stroke="#2f2b28" strokeWidth="2" transform="rotate(-25 10 28)" />
            <ellipse cx="34" cy="26" rx="6" ry="4" fill="#f4f1ea" stroke="#2f2b28" strokeWidth="2" transform="rotate(20 34 26)" />
            {/* cuernos */}
            <path d="M14 26 q-2 -6 2 -9" stroke="#d8cdb8" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M32 25 q3 -6 -1 -9" stroke="#d8cdb8" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* hocico */}
            <ellipse cx="14" cy="50" rx="10" ry="8" fill="#f2c9c2" stroke="#2f2b28" strokeWidth="2" />
            <ellipse cx="10.5" cy="49" rx="1.6" ry="2.2" fill="#2f2b28" />
            <ellipse cx="17.5" cy="49" rx="1.6" ry="2.2" fill="#2f2b28" />
            {/* ojos */}
            <circle cx="18" cy="36" r="2.2" fill="#2f2b28" />
            <circle cx="30" cy="36" r="2.2" fill="#2f2b28" />
          </g>
        </svg>
      </div>

      <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export { CowLoader };
