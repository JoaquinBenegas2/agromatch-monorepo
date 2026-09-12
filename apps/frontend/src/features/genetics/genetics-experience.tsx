import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Focus, Layers3, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import './genetics-experience.css';

const MotionContext = createContext({ reduced: false, paused: false });

/** The visual theme belongs to the genetic vertical, never the global brand. */
export function GeneticsExperience({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return (
    <MotionContext.Provider value={{ reduced, paused }}>
      <div
        className={cn('genetics-experience', className)}
        data-still={paused || reduced}
      >
        <div className="gx-atmosphere" aria-hidden="true" />
        <div className="gx-contours" aria-hidden="true">
          <svg viewBox="0 0 1200 900" preserveAspectRatio="none">
            {Array.from({ length: 9 }, (_, i) => (
              <path
                key={i}
                d={`M-200 ${170 + i * 48} C 230 ${-100 + i * 60},700 ${1000 - i * 35},1500 ${190 + i * 40}`}
                style={{ animationDelay: `${-i * 2}s` }}
              />
            ))}
          </svg>
        </div>
        <div className="gx-signature">
          <span className="gx-signal" /> MOTOR GENÉTICO / TU RODEO EN MOVIMIENTO
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaused(!paused)}
            aria-pressed={paused || reduced}
            aria-label={paused ? 'Reanudar movimiento' : 'Pausar movimiento'}
            disabled={reduced}
          >
            {paused || reduced ? <Play /> : <Pause />}
            <span>{paused || reduced ? 'En pausa' : 'Pausar'}</span>
          </Button>
        </div>
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function useGeneticsMotion() {
  const motion = useContext(MotionContext);
  return { ...motion, still: motion.paused || motion.reduced };
}

export function GeneticsHeading({
  index,
  eyebrow,
  title,
  accent,
  description,
  children,
  mark,
}: {
  index: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  children?: ReactNode;
  mark?: ReactNode;
}) {
  return (
    <header className="gx-heading">
      <p className="gx-eyebrow">
        <i>{index}</i>
        {eyebrow}
      </p>
      <h1 className={mark ? 'gx-branded-title' : undefined}>
        {mark}
        {title}
        {accent && (
          <>
            <br />
            <em>{accent}</em>
          </>
        )}
      </h1>
      <p className="gx-description">{description}</p>
      {children}
    </header>
  );
}

export function SceneControls({
  camera,
  onCamera,
  exploded,
  onExplode,
  onReset,
}: {
  camera: string;
  onCamera: () => void;
  exploded?: boolean;
  onExplode?: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="gx-scene-controls">
      <span>Arrastrá para explorar</span>
      <Button
        variant="secondary"
        size="icon"
        onClick={onCamera}
        aria-label={`Cambiar cámara, actual ${camera}`}
        title="Cambiar cámara"
      >
        <Focus />
      </Button>
      {onExplode && (
        <Button
          variant="secondary"
          size="icon"
          onClick={onExplode}
          aria-pressed={exploded}
          aria-label="Desarmar o reunir las facetas"
        >
          <Layers3 />
        </Button>
      )}
      {onReset && (
        <Button
          variant="secondary"
          size="icon"
          onClick={onReset}
          aria-label="Repetir encuentro"
        >
          <RotateCcw />
        </Button>
      )}
    </div>
  );
}

/** Animation state never participates in matching calculations or API requests. */
export function useEncounterSequence() {
  const { still } = useGeneticsMotion();
  const [sequence, setSequence] = useState(0);
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const scrubbed = useRef(false);
  useEffect(() => {
    if (!active) return;
    if (still) {
      const frame = requestAnimationFrame(() => {
        progressRef.current = 1;
        setProgress(1);
      });
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0,
      previous = 0;
    const start = performance.now() - progressRef.current * 4800;
    const tick = (now: number) => {
      if (scrubbed.current) return;
      progressRef.current = Math.min(1, (now - start) / 4800);
      if (now - previous > 80 || progressRef.current === 1) {
        setProgress(progressRef.current);
        previous = now;
      }
      if (progressRef.current < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, sequence, still]);
  return {
    active,
    progress,
    progressRef,
    play: () => {
      scrubbed.current = false;
      progressRef.current = 0;
      setProgress(0);
      setActive(true);
      setSequence((n) => n + 1);
    },
    reset: () => {
      scrubbed.current = true;
      progressRef.current = 0;
      setProgress(0);
      setActive(false);
    },
    scrub: (value: number) => {
      scrubbed.current = true;
      progressRef.current = value;
      setProgress(value);
    },
  };
}
