# Monorepo (Nx + React + NestJS)

Monorepo integrado con [Nx](https://nx.dev), TypeScript en todo el stack, y npm workspaces.

## Estructura

- `apps/frontend` — React + Vite + Tailwind CSS (puerto `4200`)
- `apps/backend` — NestJS + Prisma + PostgreSQL, prefijo global `/api` (puerto `3333`)
- `packages/shared-types` — Tipos TypeScript compartidos entre frontend y backend (`@org/shared-types`)

El dev server del frontend proxea `/api/*` hacia el backend, así que en desarrollo se puede hacer `fetch('/api/users')` directamente sin preocuparse por CORS ni URLs absolutas.

## Arrancar a desarrollar

```sh
npm install
npm run db:setup
npm run dev
```

Esto levanta frontend (`http://localhost:4200`) y backend (`http://localhost:3333/api`) en paralelo con hot-reload.

## Base de datos (Prisma + PostgreSQL)

El schema vive en `apps/backend/prisma/schema.prisma`. La URL de conexión está en `.env` en la raíz (`DATABASE_URL`). Copiá `.env.example` como `.env` para usar los valores locales.

El contenedor local usa PostgreSQL 17 e incluye las extensiones PostGIS y pgvector. Los datos quedan persistidos en el volumen Docker `agromatch-postgres-data`.

```sh
npm run db:setup       # construir, levantar, esperar y migrar PostgreSQL
npm run db:up          # levantar PostgreSQL
npm run db:deploy      # aplicar migraciones existentes
npm run db:migrate     # crear/aplicar una migración
npm run db:generate    # regenerar el cliente de Prisma tras editar el schema
npm run db:validate    # validar schema y configuración de Prisma
npm run db:studio      # abrir Prisma Studio (GUI para ver/editar datos)
npm run db:down        # detener los contenedores
```

El backend requiere una URL `postgresql://` o `postgres://`; no existe fallback a una base local de archivos.

Los valores de `POSTGRES_DB`, `POSTGRES_USER` y `POSTGRES_PORT` se pueden personalizar en `.env`. Si se cambian, `DATABASE_URL` debe usar los mismos valores. El contenedor de desarrollo usa autenticación local sin contraseña y publica el puerto únicamente en `127.0.0.1`; los entornos desplegados deben usar una `DATABASE_URL` con credenciales administradas y no reutilizar esta configuración local.

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
