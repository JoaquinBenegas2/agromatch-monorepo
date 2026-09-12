# QA manual: cómo probar la app de verdad (back + front + IA)

> **Para qué existe:** que cualquiera pueda levantar AgroMatch completo y verificar un flujo de punta a punta — API, pantalla y Claude en vivo — sin adivinar comandos ni credenciales.
>
> Escrito desde una corrida real (sep-2026), no desde la teoría. Los tropiezos que aparecen acá son los que efectivamente pasaron.

---

## 1. Cuentas de prueba

Usuarios simulados (no hay login: se manda el header `x-user-id`). Salen de `packages/shared-types/fixtures/users.json`.

| `x-user-id` | Rol | Tambos |
|---|---|---|
| `tambero-a` | FARMER | `farm-a` — **el rodeo real de 293 animales** |
| `tambero-b` | FARMER | `farm-b` (sintético). Sirve para probar el 403 contra `farm-a` |
| `asesor-1` | ADVISOR | `farm-a`, `farm-b`, `farm-c` |
| `admin` | ADMIN | los tres |

## 2. Clave de la IA

`.env` en la raíz del repo (está gitignoreado, la clave **nunca** entra al repo):

```
ANTHROPIC_API_KEY=sk-ant-...
AI_MODE=live
```

- `AI_MODE` por default ya es `live` (`process.env['AI_MODE'] ?? 'live'`). Se pone `fake` solo para trabajar sin clave: devuelve respuestas fijas y no sale a la red.
- **La demo va en `live`** (convenciones §6): nada pregrabado.

## 3. Levantar el stack

### 3.1 Base de datos

Por decisión D9 el proyecto usa **PostgreSQL + Prisma**:

```bash
npm run db:up        # docker compose (postgres con pgvector/postgis)
npm run db:migrate
npm run db:seed      # carga el rodeo real, toros, proveedores
```

> ⚠️ **Si no tenés Docker**, ver §6: hay una alternativa verificada que no necesita base.

### 3.2 Backend (`:3333`, prefijo `/api`)

```bash
npx nx serve backend
```

> ⚠️ **Bug conocido en Windows.** El executor `@nx/js:node` arma mal la ruta de los paquetes del workspace (se come la letra de unidad: busca `/Users/...` en vez de `C:/Users/...`) y el proceso muere con `Cannot find module '.../packages/shared-types/dist'`.
> **Workaround verificado:** correr el bundle directo, que resuelve por los symlinks de npm workspaces:
> ```bash
> npx nx build backend && node apps/backend/dist/main.js
> ```

### 3.3 Frontend (`:4200`)

```bash
npx nx serve frontend
```

> ⚠️ Vite hace HMR apenas termina de pre-bundlear dependencias, y **eso recarga la página y resetea el estado de React** (por ejemplo, el panel del chat se cierra solo). Si estás automatizando con Playwright, esperá a que el log diga que terminó el `optimizer`, o volvé a abrir el panel.

### 3.4 Health check

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3333/api   # 200
```

## 4. Recorrido de QA (el que hay que correr entero)

Los números de abajo son los **reales verificados** con `farm-a`. Si dan distinto, hay una regresión.

### 4.1 Errores y aislamiento (API)

```bash
# 401: sin header
curl -s http://localhost:3333/api/farms/farm-a/chat -X POST \
  -H "Content-Type: application/json" -d '{"question":"hola"}'
# → {"code":"USER_HEADER_MISSING",...}

# 403: tambero-b no puede ver farm-a (RN-38)
curl -s http://localhost:3333/api/farms/farm-a/chat -X POST \
  -H "x-user-id: tambero-b" -H "Content-Type: application/json" -d '{"question":"hola"}'
# → {"code":"FARM_FORBIDDEN",...}

# 409: rodeo sin clasificar todavía
curl -s http://localhost:3333/api/farms/farm-a/chat -X POST \
  -H "x-user-id: tambero-a" -H "Content-Type: application/json" -d '{"question":"hola"}'
# → {"code":"HERD_NOT_CLASSIFIED",...}

# 400: body inválido
curl -s http://localhost:3333/api/farms/farm-a/chat -X POST \
  -H "x-user-id: tambero-a" -H "Content-Type: application/json" -d '{}'
# → {"code":"VALIDATION_ERROR", details.issues: [...]}
```

### 4.2 Clasificar el rodeo real

```bash
curl -s http://localhost:3333/api/farms/farm-a/classifications -X POST \
  -H "x-user-id: tambero-a" -H "Content-Type: application/json" \
  -d '{"goal":{"preset":"SOLIDS_CHEESE","weights":{"fat":0.35,"pro":0.35,"pl":0.15,"scs":0.15},"wantBetaA2":false,"wantKappaBB":true}}'

curl -s http://localhost:3333/api/farms/farm-a/classifications/summary -H "x-user-id: tambero-a"
```

**Esperado (SOLIDS_CHEESE, sep-2026):**

```json
{"byTier":{"ELITE":72,"COMMERCIAL":151,"BEEF":68,"CULL_ALERT":2},
 "total":293,"withoutProfile":0,"classicRulesBeefCount":186}
```

- `total: 293` → es el rodeo real completo.
- `NO_SIRE: 2` en `byTag` → los dos animales sin padre documentados en el handoff.

### 4.3 El chat, con Claude en vivo

```bash
curl -s --max-time 90 http://localhost:3333/api/farms/farm-a/chat -X POST \
  -H "x-user-id: tambero-a" -H "Content-Type: application/json" \
  -d '{"question":"¿cuántas terneras van a carne?"}'
```

| Pregunta | `usedTools` esperado | Qué mirar |
|---|---|---|
| "¿cuántas terneras van a carne?" | `["countByTier"]` | el número tiene que ser **68**, igual a `byTier.BEEF` del resumen (RN-17: la IA no cuenta, cuenta la herramienta) |
| "¿cuáles me sirven para vender leche A2?" | `["listFemales"]` | lista de `visualId` reales del rodeo |
| "¿por qué la 3031 es comercial?" | `["explainClassification"]` | el texto menciona el SCS / la mastitis |
| "¿qué toro me conviene comprar?" | `[]` | **no inventa**: dice que eso se ve en el swipe. En la UI sale marcado `FALLBACK` |

### 4.4 El chat en la pantalla (C6 + B7 + D8)

1. Ir a `http://localhost:4200/motor-genetico/tablero`.
2. El botón del chat está **en el Topbar** (`aria-label="Abrir chat sobre el rodeo"`), no en el sidebar.
3. Abrirlo → panel derecho de 320px con el composer.
4. Preguntar "¿cuántas terneras van a carne?" → tiene que verse: la pregunta, la respuesta con **68**, el badge de origen (`AI` / `FALLBACK`) y **el badge con la herramienta usada** (`countByTier`).
5. Ir a `http://localhost:4200/mercado` → **ni el botón ni el panel existen** (REQ-FS-09: el chat vive solo en `/motor-genetico/*`).

### 4.5 El swipe (matching genético)

```bash
curl -s http://localhost:3333/api/farms/farm-a/females/f-3031/matches -X POST \
  -H "x-user-id: tambero-a" -H "Content-Type: application/json" \
  -d '{"goal":{"preset":"SOLIDS_CHEESE","weights":{"fat":0.35,"pro":0.35,"pl":0.15,"scs":0.15},"wantBetaA2":false,"wantKappaBB":true}}'
```

**Esperado (SOLIDS_CHEESE, sep-2026), verificado contra el rodeo real:**

| Qué | Valor |
|---|---|
| `ranked.length` | **19** |
| `excluded.length` | **1** → `029HO21010`, el padre de la 3031, con `RN-05` y el detalle "25% de consanguinidad" |
| `#1` | `29HO22734` (DENOVO 24492 MERIT-P-ET), `compatibility: 100` |
| `#1` → `verticalFacts.expectedProgeny.scs` | **3.00**, bajando desde el 3,19 de la madre — el rescate de la 3031 |

Ojo: con `preset: BALANCED` y `weights: {}` el ranking es distinto (empata a todos en 100 y el `#1` pasa a ser `029HO19531`). Los números de arriba son con `SOLIDS_CHEESE`.

> 📌 La `Need` sintética del matching genético **no declara `where` ni `window`** a propósito (una pajuela viaja por correo). RN-31 lo reporta como "no se evalúa cobertura / disponibilidad" con `passed: true`, y el término de cercanía sale del puntaje renormalizando. Si alguna vez volvés a ver `ranked: 0`, mirá primero `filters` en `excluded`: es el síntoma de que alguien le puso una ubicación inventada.

### 4.6 El swipe en la pantalla

1. Ir a `http://localhost:4200/motor-genetico/matching`.
2. Entrar por `Ver Tablero del rodeo` y elegir la hembra desde la tabla.
3. Tiene que verse el encabezado "**19 evaluados contra tu hembra · ordenado por compatibilidad · 1 excluido**", y cada tarjeta con su rango (`#1`, `#2`, …), la comparación madre vs toro y la cría esperada.

> 🐞 **Dos bugs abiertos del front (flujo D), ninguno del motor:**
> - El buscador "Buscá por ID visual (ej. 3031)" manda el `visualId` a una ruta que espera el `id` de la hembra: `POST /api/farms/farm-a/females/**3031**/matches` → **404**. Funciona entrando por el tablero, o navegando a mano a `/motor-genetico/matching/f-3031`.
> - El badge de rango dice `#1 de 0 · 100` en vez de `#1 de 19`. Además de ser un error de formato, choca con la regla 5 del proyecto: la compatibilidad se muestra como ranking relativo honesto ("#1 de 19"), nunca suelta.

## 5. Verificar que los datos quedaron bien

Con Postgres levantado (`npm run db:studio` abre Prisma Studio) o por SQL:

```sql
SELECT tier, COUNT(*) FROM "Classification" WHERE "farmId" = 'farm-a' GROUP BY tier;
-- ELITE 72 | COMMERCIAL 151 | BEEF 68 | CULL_ALERT 2
SELECT COUNT(*) FROM "Female" WHERE "farmId" = 'farm-a';  -- 293
```

Después de cada ensayo, `npm run db:reset` deja la base en el estado inicial (convenciones §9: la demo no puede depender de una base ensuciada probando).

## 6. QA sin Docker (alternativa verificada)

Si no hay Docker, **no se cambia el motor de base**. Convertir el esquema a MySQL/SQLite no es viable: usa arrays nativos de Postgres en 8 campos (`farmIds`, `semenTypes`, `tags`, `corrective`, `reasons`, `constraints`, `missingFields`, `certifications`), que Prisma no soporta fuera de Postgres — habría que pasarlos a `Json` y el QA correría sobre **un esquema distinto al que se despliega**, que es peor que no probar la persistencia.

Dos caminos:

1. **PostgreSQL nativo en Windows** (instalador de postgresql.org, sin Docker) y apuntar `DATABASE_URL` ahí. Cero cambios de código, esquema idéntico al de producción. Es la opción fiel.
2. **Repos en memoria**, solo para probar API + pantalla + IA: reemplazar los providers de `apps/backend/src/repos/repositories.module.ts` por implementaciones en memoria sembradas con los fixtures, y sacar `PrismaModule` de `app.module.ts`. Levanta todo el backend real — guards, controllers, filtro de errores, motor genético y chat — sin base.
   **Esto NO verifica la capa Prisma**: es un cambio local, nunca se commitea, y se revierte apenas termina el QA.

## 7. Qué NO cubre este QA

- **La capa Prisma** si se usó la opción 6.2 (repos en memoria).
- **Los núcleos** (`matching-core`, `genetics-core`) no se prueban a mano: tienen tests Vitest y son la red de seguridad real (convenciones §1). Correr `npx nx run-many -t test`.
- `nx typecheck backend` tiene una fragilidad preexistente con las referencias de proyecto de TypeScript en Windows (errores `TS6305` en archivos sin tocar). `nx build` y `nx test` sí son señal confiable.
