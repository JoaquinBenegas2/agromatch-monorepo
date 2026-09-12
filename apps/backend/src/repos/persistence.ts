/**
 * Perfil de persistencia del backend (docs/qa-config.md §3.1, §6.2).
 * `postgres` (default): repos detrás de Prisma, requiere `DATABASE_URL`.
 * `memory`: repos en memoria sembrados con `@org/shared-types/fixtures`,
 * sin base de datos. Pensado para desplegar la demo en una VM sin Postgres.
 * Mismo estilo que `isLive()` en `ai/ai.providers.ts`.
 */
export function isMemoryPersistence(): boolean {
  return (process.env['PERSISTENCE'] ?? 'postgres') === 'memory';
}
