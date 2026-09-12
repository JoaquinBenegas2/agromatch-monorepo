# AgroMatch en VM06 — `hackaton.vylaris.com.ar`

Toda la configuración del deploy vive en **un solo archivo**:
`\\vm06\shared\hackaton\backend\.env` (key de Anthropic, modo de repositorios y
`DATABASE_URL`). No hay `dotenv-cli` ni `.env.railway` para la VM.

- `REPOSITORY_MODE=prisma` + `DATABASE_URL` (Railway): **la base persiste entre deploys**.
  Cada `deploy-vm06.ps1` aplica `prisma migrate deploy` (solo migraciones pendientes,
  nunca resetea) y el seed idempotente. Lo que la gente carga no se toca.
- `REPOSITORY_MODE=memory`: sin base, fixtures en memoria, se pierde al reiniciar.

Claude va **en vivo** (`AI_MODE=live`).

## Qué queda levantado

| Qué | Dónde | Cómo |
|---|---|---|
| Front (React + Vite, estático) | sitio IIS `hackaton.vylaris.com.ar` → `C:\apps\hackaton\front` | app pool `HackatonVylaris`, binding HTTP 80 con host header |
| Backend (NestJS, un solo `main.js`) | servicio `HackatonApi` en `C:\apps\hackaton\backend`, **localhost:8095** | NSSM, arranque automático, logs en `backend\logs\` |
| `/api` | regla de URL Rewrite + ARR en el `web.config` del front | `hackaton.vylaris.com.ar/api/...` → `localhost:8095/api/...` |

El front llama por rutas **relativas** (`/api/...`): no hay CORS ni URL absoluta.
El backend **no se expone** a internet; se llega a él a través del sitio.

## Desde la máquina de desarrollo

```powershell
npm run deploy:vm06               # migraciones + seed (si prisma), build back + front, copia al share
npm run deploy:vm06:front         # solo front
npm run deploy:vm06:back          # back (incluye el paso de base)
.\deploy\deploy-vm06.ps1 -SkipBuild        # solo copia lo ya compilado
.\deploy\deploy-vm06.ps1 -Solo db          # solo migraciones + seed
.\deploy\deploy-vm06.ps1 -SkipDb           # sin tocar la base
```

El paso de base corre **desde tu máquina** contra la `DATABASE_URL` del `.env` del
share (la VM no tiene el repo). Es determinista: `migrate deploy` es idempotente y el
seed usa `createMany({ skipDuplicates })` / `upsert`. El script se niega a usar un host
`*.railway.internal` (solo resuelve dentro de Railway): va la URL pública `*.proxy.rlwy.net`.

## En VM06 (PowerShell como administrador)

1. Pegar la key de Anthropic en `C:\shared\hackaton\backend\.env` (`ANTHROPIC_API_KEY=sk-ant-...`). Solo la primera vez.
2. Correr:

```powershell
C:\shared\hackaton\actualizar-vm06.ps1                               # deploy / redeploy completo
C:\shared\hackaton\actualizar-vm06.ps1 -Check                        # diagnóstico, no toca nada
C:\shared\hackaton\actualizar-vm06.ps1 -SoloFront                    # solo cambió el front
C:\shared\hackaton\actualizar-vm06.ps1 -AnthropicKey 'sk-ant-...'    # fuerza la key por parámetro (pisa la del .env)
```

El script copia `backend\.env` del share a `C:\apps\hackaton\backend\.env`; el
servicio lo lee al arrancar. `deploy-vm06.ps1` nunca pisa ese `.env` del share.

## HTTPS (Cloudflare delante)

El dominio pasa por Cloudflare, que le pega al origen **por 443** cuando el visitante
entra por `https://`. Sin binding 443 en el sitio, esa request cae en otro sitio de la
VM y devuelve **404** (por `http://` funciona igual). Una sola vez, en la VM:

```powershell
C:\shared\hackaton\https-binding-vm06.ps1          # crea el binding 443 (SNI) reutilizando el cert *.vylaris.com.ar
C:\shared\hackaton\https-binding-vm06.ps1 -Check   # solo lista certificados y bindings
```

## Verificar

```powershell
Invoke-WebRequest http://localhost:8095/api/me -Headers @{'x-user-id'='tambero-a'} -UseBasicParsing   # 200 (backend directo; sin header da 401, es normal)
Invoke-WebRequest http://hackaton.vylaris.com.ar/api/bulls -Headers @{'x-user-id'='tambero-a'} -UseBasicParsing   # JSON, no HTML
```

- **502** en `/api` → el servicio `HackatonApi` está caído o ARR no tiene el proxy habilitado.
- **HTML** en `/api` → la regla `api-al-backend` quedó debajo del fallback SPA (no debería: el template ya está ordenado).
- **404 al recargar** una ruta interna → falta el `web.config` en `C:\apps\hackaton\front`.

## Usuarios de prueba

No hay login: el front manda `x-user-id`. `tambero-a` (rodeo real, 293 animales), `tambero-b`, `asesor-1`, `admin`.

## Lo que NO hay que hacer

- No tocar el `web.config` a mano: viaja dentro de `front\` en cada deploy y lo pisa.
- No cambiar el puerto solo en un lado: el `web.config` y el servicio tienen que coincidir (`-Puerto` del script ajusta los dos).
- No pretender persistencia mientras esté en memoria: lo cargado se pierde al reiniciar el servicio.

## Cambiar de base (o de modo)

Prisma ya viaja dentro del `main.js`; no hay que recompilar nada.

1. En `\\vm06\shared\hackaton\backend\.env`: `REPOSITORY_MODE=prisma` y `DATABASE_URL=postgresql://...` (URL pública de Railway).
2. `npm run deploy:vm06` desde tu máquina: migra y siembra esa base, y copia el bundle.
3. `C:\shared\hackaton\actualizar-vm06.ps1` en la VM (aborta si `prisma` y `DATABASE_URL` vacía).

Para volver a memoria: `REPOSITORY_MODE=memory` y repetir 2 y 3.
