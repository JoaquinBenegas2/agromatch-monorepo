import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Spatial } from './world-engine';

export type SpatialSceneKind = 'genetic' | 'market' | 'herd' | 'import' | 'advisor' | 'plan';

/**
 * Todos los callbacks son opcionales y se leen en cada frame (no en el
 * montaje): pasar valores nuevos en cada render alcanza, no hace falta
 * memoizarlos.
 */
export interface SpatialSceneOptions {
  progress?: () => number;
  projected?: () => boolean;
  explode?: () => boolean;
  camera?: () => 'orbit' | 'top' | 'front';
  reduced?: () => boolean;
  paused?: () => boolean;
  found?: () => boolean;
  usual?: () => boolean;
  imported?: () => boolean;
  selected?: () => string;
  filter?: () => string;
  onSelect?: (id: string) => void;
  order?: () => number[];
  count?: () => number;
  /** Salta la animación de entrada (usado al reabrir una escena ya vista). */
  intro?: boolean;
}

export interface SpatialSceneProps {
  kind: SpatialSceneKind;
  options?: SpatialSceneOptions;
  className?: string;
  /** Anclas de texto: <div data-anchor="mother" className="spatial-label">…</div> */
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Escena WebGL low-poly del laboratorio visual "Futuros"
 * (designs/visual-lab/index.html) montada como componente React. Es
 * puramente ilustrativa: no representa un resultado genético real ni
 * predice sexo, pelaje o aspecto (mismo criterio que el mockup de origen).
 */
export function SpatialScene({ kind, options, className, children, fallback }: SpatialSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const world = new Spatial.World(canvas, kind, {
      progress: () => optionsRef.current?.progress?.() ?? 0,
      projected: () => optionsRef.current?.projected?.() ?? false,
      explode: () => optionsRef.current?.explode?.() ?? false,
      camera: () => optionsRef.current?.camera?.() ?? 'orbit',
      reduced: () => optionsRef.current?.reduced?.() ?? prefersReduced,
      paused: () => optionsRef.current?.paused?.() ?? false,
      found: () => optionsRef.current?.found?.() ?? false,
      usual: () => optionsRef.current?.usual?.() ?? false,
      imported: () => optionsRef.current?.imported?.() ?? false,
      selected: () => optionsRef.current?.selected?.() ?? '',
      filter: () => optionsRef.current?.filter?.() ?? 'all',
      onSelect: (id: string) => optionsRef.current?.onSelect?.(id),
      order: () => optionsRef.current?.order?.(),
      count: () => optionsRef.current?.count?.() ?? 1,
      intro: optionsRef.current?.intro,
    });

    return () => world.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options se leen por ref en cada frame
  }, [kind]);

  return (
    <div ref={containerRef} className={cn('spatial-world relative isolate overflow-hidden', className)}>
      <canvas ref={canvasRef} className="spatial-world-canvas" aria-hidden />
      {children}
      <div className="spatial-world-fallback">
        {fallback ?? <p className="text-[11px]">Vista de respaldo · WebGL no disponible</p>}
      </div>
    </div>
  );
}

export function SpatialLabel({
  anchor,
  className,
  ...props
}: React.ComponentProps<'div'> & { anchor: string }) {
  return <div data-anchor={anchor} className={cn('spatial-label', className)} {...props} />;
}
