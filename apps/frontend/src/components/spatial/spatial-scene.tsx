import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Spatial } from './world-engine';

export type SpatialSceneKind =
  'genetic' | 'market' | 'herd' | 'import' | 'advisor' | 'plan';
export interface SpatialAnimal {
  id: string;
  group: 'ELITE' | 'COMMERCIAL' | 'BEEF' | 'CULL_ALERT' | 'UNCLASSIFIED';
  visible?: boolean;
}

/**
 * Todos los callbacks son opcionales y se leen en cada frame (no en el
 * montaje): pasar valores nuevos en cada render alcanza, no hace falta
 * memoizarlos.
 */
export interface SpatialSceneOptions {
  immersive?: boolean;
  animals?: () => SpatialAnimal[];
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
export function SpatialScene({
  kind,
  options,
  className,
  children,
  fallback,
}: SpatialSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  const worldRef = useRef<InstanceType<typeof Spatial.World> | null>(null);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const world = new Spatial.World(canvas, kind, {
      immersive: () => optionsRef.current?.immersive ?? false,
      animals: () => optionsRef.current?.animals?.(),
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
    worldRef.current = world;

    return () => {
      world.dispose();
      worldRef.current = null;
    };
  }, [kind]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'spatial-world relative isolate overflow-hidden',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="spatial-world-canvas"
        tabIndex={options?.immersive ? 0 : undefined}
        aria-hidden={options?.immersive ? undefined : true}
        aria-label={
          options?.immersive
            ? 'Escena 3D. Arrastrá o usá las flechas para cambiar la perspectiva. Inicio restablece la vista.'
            : undefined
        }
        onKeyDown={(event) => {
          const world = worldRef.current;
          if (!world) return;
          const keys: Record<string, number[]> = {
            ArrowLeft: [-0.12, 0],
            ArrowRight: [0.12, 0],
            ArrowUp: [0, 0.08],
            ArrowDown: [0, -0.08],
          };
          const direction = keys[event.key];
          if (direction) {
            event.preventDefault();
            world.pan(direction[0], direction[1]);
          }
          if (event.key === 'Home') {
            event.preventDefault();
            world.resetCamera();
          }
        }}
      />
      {children}
      <div className="spatial-world-fallback">
        {fallback ?? (
          <p className="text-[11px]">Vista de respaldo · WebGL no disponible</p>
        )}
      </div>
    </div>
  );
}

export function SpatialLabel({
  anchor,
  className,
  ...props
}: React.ComponentProps<'div'> & { anchor: string }) {
  return (
    <div
      data-anchor={anchor}
      className={cn('spatial-label', className)}
      {...props}
    />
  );
}
