import type { VerticalEngine } from '@org/shared-types';

const verticalRegistry: VerticalEngine[] = [];

/** M2 (RN-35): un vertical se registra; el núcleo no lo conoce de antemano. */
export function registerVertical(engine: VerticalEngine): void {
  if (verticalRegistry.some((v) => v.category === engine.category)) return;
  verticalRegistry.push(engine);
}

export function listVerticals(): VerticalEngine[] {
  return [...verticalRegistry];
}
