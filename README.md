# Monorepo (Nx + React + NestJS)

Monorepo integrado con [Nx](https://nx.dev), TypeScript en todo el stack, y npm workspaces.

## Estructura

- `apps/frontend` — React + Vite + Tailwind CSS (puerto `4200`)
- `apps/backend` — NestJS + Prisma (SQLite en dev), prefijo global `/api` (puerto `3333`)
- `packages/shared-types` — Tipos TypeScript compartidos entre frontend y backend (`@org/shared-types`)

El dev server del frontend proxea `/api/*` hacia el backend, así que en desarrollo se puede hacer `fetch('/api/users')` directamente sin preocuparse por CORS ni URLs absolutas.

## Arrancar a desarrollar

```sh
npm install
npm run dev
```

Esto levanta frontend (`http://localhost:4200`) y backend (`http://localhost:3333/api`) en paralelo con hot-reload.

## Base de datos (Prisma + SQLite)

El schema vive en `apps/backend/prisma/schema.prisma`. La URL de conexión está en `.env` en la raíz (`DATABASE_URL`).

```sh
npm run db:migrate     # crear/aplicar una migración
npm run db:generate    # regenerar el cliente de Prisma tras editar el schema
npm run db:studio      # abrir Prisma Studio (GUI para ver/editar datos)
```

Para pasar a Postgres/MySQL en el futuro: cambiar `provider` en `schema.prisma`, actualizar `DATABASE_URL`, cambiar el driver adapter en `apps/backend/src/prisma/prisma.service.ts` (hoy usa `@prisma/adapter-better-sqlite3`) e instalar el adapter correspondiente (`@prisma/adapter-pg`, etc).

## Tipos compartidos

Cualquier tipo/interfaz que use tanto el frontend como el backend va en `packages/shared-types/src/lib/shared-types.ts` y se importa como `@org/shared-types` desde cualquier proyecto (resuelve directo al `.ts` fuente en dev, sin build intermedio).

## Otros comandos

```sh
npm run build   # build de producción de frontend y backend
npm run test    # tests de frontend y backend
npm run lint    # lint de todos los proyectos
```

Para generar nuevas apps/libs, usar los generadores de Nx, p.ej.:

```sh
npx nx g @nx/react:lib packages/ui
npx nx g @nx/nest:resource apps/backend/src/app/products
```
