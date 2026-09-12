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

> ⚠️ **Si no tenés Docker**, ver §6: hay una alternativa verificada que no necesita base (modo `REPOSITORY_MODE=memory`, real y commiteado — no un cambio local).

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

**Esperado (sep-2026).** El tier depende del objetivo, así que hay dos juegos de números válidos:

| Objetivo | ELITE | COMMERCIAL | BEEF | CULL_ALERT | Dónde se usa |
|---|---|---|---|---|---|
| `SOLIDS_CHEESE` (el curl de arriba) | 72 | 151 | 68 | 2 | API |
| `BALANCED` | 72 | 133 | 86 | 2 | **el botón "Clasificar" del Tablero** (usa BALANCED fijo) |

- `total: 293` → es el rodeo real completo, en los dos casos.
- `NO_SIRE: 2` en `byTag` → los dos animales sin padre documentados en el handoff.
- El chat (`countByTier`) responde con el tier de la **última** clasificación: si clasificaste desde el Tablero, "terneras a carne" da **86**, no 68.

### 4.3 El chat, con Claude en vivo

```bash
curl -s --max-time 90 http://localhost:3333/api/farms/farm-a/chat -X POST \
  -H "x-user-id: tambero-a" -H "Content-Type: application/json" \
  -d '{"question":"¿cuántas terneras van a carne?"}'
```

| Pregunta | `usedTools` esperado | Qué mirar |
|---|---|---|
| "¿cuántas terneras van a carne?" | `["countByTier"]` | el número tiene que ser igual a `byTier.BEEF` del resumen vigente (**68** con SOLIDS_CHEESE, **86** con BALANCED) — RN-17: la IA no cuenta, cuenta la herramienta |
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

**Esperado (SOLIDS_CHEESE, sep-2026), verificado contra el rodeo real.** La 3031 es **vaquillona (HEIFER)**, así que RN-06 (facilidad de parto ≤ 2,5 del tambo) aplica y recorta el catálogo:

| Qué | Valor |
|---|---|
| `ranked.length` | **2** |
| `excluded.length` | **18** → **17 por `RN-06`** (los 13 Holstein reales de ABS no declaran facilidad de parto y 4 semilla la superan) y **1 por `RN-05`** (`029HO21010`, su padre, 25 % de consanguinidad) |
| `#1` | `029HO20100`, `compatibility: 100`, `expectedProgeny.scs` **2,895** (bajando desde 3,19: el rescate de la 3031) |
| `#2` | `200JE01234` (Jersey), `compatibility: 0` |

Para ver el catálogo real completo usá una **vaca adulta**, por ejemplo `f-2755` (caravana 2755): **18 evaluados / 2 excluidos** (los dos por RN-05), `#1` `29HO22734` (DENOVO 24492 MERIT-P-ET), `#2` `29HO22620`, `#3` `29HO22735`.

> 📌 La `Need` sintética del matching genético **no declara `where` ni `window`** a propósito (una pajuela viaja por correo) y va marcada `synthetic`. RN-31 lo reporta como "no aplica" con `passed: true`, y el término de cercanía sale del puntaje renormalizando. Si alguna vez volvés a ver `ranked: 0`, mirá primero `filters` en `excluded`: es el síntoma de que alguien le puso una ubicación inventada.
>
> 📌 Que los 13 ABS queden afuera para **toda** vaquillona no es un bug del motor: es la regla de oro (sin dato no se rellena). Es un hueco de **datos** de A6 — falta cargar el CE/SCE que ABS publica.

### 4.6 El swipe en la pantalla

1. Ir a `http://localhost:4200/motor-genetico/matching`.
2. Escribir la **caravana** (`3031`) en "Caravana de la hembra" y Enter → navega a `/motor-genetico/matching/f-3031`. Una caravana inexistente (`9999`) avisa "No encontramos la caravana" sin navegar. También se entra desde el Tablero.
3. Encabezado "**2 evaluados contra tu hembra · ordenado por compatibilidad · 18 excluidos**" (con BALANCED, que es lo que trae el Tablero), badge **`#1 de 2`**, la comparación madre vs toro y la cría esperada; la sección de excluidos lista los motivos (RN-06 en su mayoría).
4. "Elegir para el plan" → `POST …/plan/items` 201, badge "En el plan", y **sobrevive a un F5** (lee `GET …/plan`).
5. Cambiar el preset y "Procesar" con "quiero más grasa y proteína" → `POST /api/goals/parse` y el ranking cambia.

### 4.7 El marketplace de punta a punta (N1 → N4)

1. `/mercado` → "necesito quien me are 40 ha en Río Cuarto la semana que viene" → `POST /api/needs` 201 (Claude parsea; hasta 60 s). En "Lo que AgroMatch entendió", **Ubicación tiene que mostrar "Río Cuarto"** (lo interpretado se ofrece como opción aunque no esté en la lista fija).
2. "Confirmar y buscar soluciones" → `PATCH /api/needs/:id` + `POST /api/needs/:id/matches` → 3 contratistas rankeados ("**#1 de 3**", ranking relativo, nunca probabilidad). Badge por proveedor: **No verificado / Verificado / Con historial** (este último cuando `reputation.jobs > 0`).
3. "Pedir fecha" al #1 → `POST /api/needs/:id/requests` 201 → el diálogo muestra el contacto y, debajo, **"¿Ya se hizo el trabajo? Valoralo"**: 4 estrellas + comentario → `POST /api/requests/:id/review` 201 → "Valoración enviada". El botón de la tarjeta pasa a "Ver solicitud · Valorar".
4. Una necesidad genética ("quiero mejorar los sólidos de mi tambo…") → "Ir al motor genético" abre `/motor-genetico/matching` con el preset ya en "Más sólidos (quesera)".

### 4.8 Asesor, tabs y errores

- `/motor-genetico/asesor` como `tambero-a` → bloqueado por rol. Como `asesor-1` → `GET /api/advisor/overview` con los 3 tambos; **"Ver tablero"** en una tarjeta abre el Tablero de ese tambo y lo deja como activo en el selector.
  - En "Comparación de rasgos promedio", el Tambo A muestra **Leche −297 y Proteína −0,2**: no es un bug. Son PTAs reales (desvíos respecto de la base CDCB) del rodeo anonimizado; los tambos B y C son sintéticos y por eso dan valores positivos.
- Chat: "¿cuántas terneras van a carne?" tiene que responder **solo el BEEF** (86 con BALANCED), nunca la suma de los cuatro tiers. Si Claude escribe un número que no está en el resultado de la herramienta, se muestra el dato crudo (RN-18).
- Carga del rodeo: el resultado dice las filas importadas **y las rechazadas con fila y motivo** (con el Excel de prueba: 25 OK · 1 rechazada, la fila "fin de planilla").
- Ninguna tab real (Matching, Tablero, Carga, Asesor, Plan) muestra "todavía no implementada"; solo `Mis matches / mensajes` y `Cargar lotes / servicios` siguen como **pendiente** (placeholders honestos, fuera del MVP).
- `/motor-genetico/matching/f-no-existe` → "No encontramos esa hembra en el tambo". Una URL inexistente → "Esta página no existe" con "Ir al mercado" (nunca pantalla en blanco).

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
2. **Modo `REPOSITORY_MODE=memory`**, solo para probar API + pantalla + IA: repositorios en memoria (`apps/backend/src/repos/memory.providers.ts`) sembrados en el arranque con los mismos fixtures de `@org/shared-types/fixtures` que usa `prisma/seed.ts`. `repositories.module.ts` registra estas implementaciones en vez de las de Prisma cuando `useMemoryRepositories` (`apps/backend/src/repos/repository-mode.ts`) da `true`, y `app.module.ts` ni importa `PrismaModule` en ese modo. Levanta todo el backend real — guards, controllers, filtro de errores, motor genético, chat y negociaciones — sin base:

   ```bash
   npx nx build backend
   REPOSITORY_MODE=memory node apps/backend/dist/main.js
   ```

   En PowerShell:

   ```powershell
   npx nx build backend
   $env:REPOSITORY_MODE='memory'; node apps/backend/dist/main.js
   ```

   Es un modo real y commiteado, gateado por la variable de entorno `REPOSITORY_MODE` (default `prisma`) — no un cambio local para revertir a mano. Es el modo con el que corre la demo desplegada en VM06 (`deploy/LEEME-vm06.md`). Los datos viven solo en memoria del proceso: se pierden al reiniciar, por diseño. `apps/backend/src/repos/memory-profile.e2e.spec.ts` levanta el `AppModule` completo en este modo y verifica los números de §4.2 y §4.5.
   **Esto NO verifica la capa Prisma** (ver §7).

## 7. Qué NO cubre este QA

- **La capa Prisma** si se usó la opción 6.2 (repos en memoria).
- **Los núcleos** (`matching-core`, `genetics-core`) no se prueban a mano: tienen tests Vitest y son la red de seguridad real (convenciones §1). Correr `npx nx run-many -t test`.
- `nx typecheck backend` tiene una fragilidad preexistente con las referencias de proyecto de TypeScript en Windows (errores `TS6305` en archivos sin tocar). `nx build` y `nx test` sí son señal confiable.
- `nx lint frontend` tiene 3 errores preexistentes en `components/spatial/*` (escenas WebGL "Futuros"): `@ts-nocheck` y `prefer-const` en `world-engine.ts`, y un acceso a ref durante el render en `spatial-scene.tsx`. No son de los flujos de negocio.
- `nx test ai` bajo Nx: el test "construye sin clave" necesita que el spec pase `''` y no `undefined`, porque **Nx inyecta el `.env` raíz** (con la clave) en el entorno del test.
- **Responsive: la app es de escritorio.** A ~400 px el sidebar no colapsa (scroll horizontal, títulos cortados) y el canvas WebGL de las escenas queda en 1×1 px. Es del sistema visual (`components/ui/sidebar.tsx`, `components/spatial/*`), pendiente para su dueño; la demo va a 1280 px.
- **Lo que la explicación de IA marca como `FALLBACK` no es un error**: es RN-18 actuando (Claude escribió un número que no está literal en los hechos) y se muestra el texto determinístico. El backend no loguea nada en ese caso.
