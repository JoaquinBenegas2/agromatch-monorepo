import type { INestApplication } from '@nestjs/common';

/**
 * Prueba de humo del perfil `PERSISTENCE=memory` (docs/qa-config.md §6.2):
 * levanta el `AppModule` real completo (guards, controllers, filtro de
 * errores, motor genético, chat) sin Postgres, y verifica los mismos
 * números que el QA manual verifica contra Postgres real (§4.2, §4.5).
 *
 * Gotcha (§7): Nx inyecta el `.env` raíz (con ANTHROPIC_API_KEY y sin
 * PERSISTENCE) en el entorno de test. Seteamos ambas variables ACÁ, antes
 * de importar `AppModule` — con `import()` dinámico, no estático, porque
 * `repositories.module.ts` y `ai/ai.providers.ts` leen `process.env` una
 * sola vez al evaluarse el módulo (arrays de providers a nivel de archivo).
 */
process.env['PERSISTENCE'] = 'memory';
process.env['AI_MODE'] = 'fake';

const BASE_GOAL = {
  preset: 'SOLIDS_CHEESE',
  weights: { fat: 0.35, pro: 0.35, pl: 0.15, scs: 0.15 },
  wantBetaA2: false,
  wantKappaBB: true,
};

describe('Perfil en memoria (PERSISTENCE=memory) — e2e de humo', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const { NestFactory } = await import('@nestjs/core');
    const { AppModule } = await import('../../app/app.module.js');

    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? address : address?.port;
    baseUrl = `http://127.0.0.1:${port}`;
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/me con x-user-id: tambero-a devuelve 200 y el tambo del usuario', async () => {
    const res = await fetch(`${baseUrl}/api/me`, { headers: { 'x-user-id': 'tambero-a' } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe('tambero-a');
    expect(body.farms.map((f: { id: string }) => f.id)).toEqual(['farm-a']);
  });

  it('GET /api/bulls devuelve el catálogo sembrado, no vacío', async () => {
    const res = await fetch(`${baseUrl}/api/bulls`, { headers: { 'x-user-id': 'tambero-a' } });

    expect(res.status).toBe(200);
    const bulls = await res.json();
    expect(Array.isArray(bulls)).toBe(true);
    expect(bulls.length).toBeGreaterThan(0);
  });

  it('clasifica el rodeo real de farm-a y el resumen da los números verificados (§4.2)', async () => {
    const classifyRes = await fetch(`${baseUrl}/api/farms/farm-a/classifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'tambero-a' },
      body: JSON.stringify({ goal: BASE_GOAL }),
    });
    expect([200, 201]).toContain(classifyRes.status);

    const summaryRes = await fetch(`${baseUrl}/api/farms/farm-a/classifications/summary`, {
      headers: { 'x-user-id': 'tambero-a' },
    });
    expect(summaryRes.status).toBe(200);
    const summary = await summaryRes.json();

    expect(summary.total).toBe(293);
    expect(summary.byTier).toEqual({ ELITE: 72, COMMERCIAL: 151, BEEF: 68, CULL_ALERT: 2 });
  });

  it('el swipe de f-3031 da 2 evaluados y 18 excluidos con SOLIDS_CHEESE (§4.5)', async () => {
    const res = await fetch(`${baseUrl}/api/farms/farm-a/females/f-3031/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'tambero-a' },
      body: JSON.stringify({ goal: BASE_GOAL }),
    });

    expect(res.status).toBe(201);
    const board = await res.json();
    expect(board.ranked).toHaveLength(2);
    expect(board.excluded).toHaveLength(18);
  });

  it('POST /api/farms/farm-a/chat con x-user-id: tambero-b da 403 FARM_FORBIDDEN', async () => {
    const res = await fetch(`${baseUrl}/api/farms/farm-a/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'tambero-b' },
      body: JSON.stringify({ question: 'hola' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FARM_FORBIDDEN');
  });
});
