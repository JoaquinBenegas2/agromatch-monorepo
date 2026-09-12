# AgroMatch en VM06 — `hackaton.vylaris.com.ar`

Deploy de demo **sin base de datos**: el backend corre con `PERSISTENCE=memory`
(los fixtures se cargan en memoria al arrancar; lo que se clasifica o carga se
pierde al reiniciar el servicio). Claude va **en vivo** (`AI_MODE=live`).

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
.\deploy\deploy-vm06.ps1          # build back (bundle autocontenido) + front, copia a \\vm06\shared\hackaton
.\deploy\deploy-vm06.ps1 -Solo front
.\deploy\deploy-vm06.ps1 -SkipBuild
```

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

## Pasar a Postgres real (más adelante)

Prisma ya viaja dentro del `main.js`; no hay que recompilar nada.

1. Desde la máquina dev, con `DATABASE_URL` apuntando a esa base: `npm run db:deploy` (migraciones) y `npx nx run @org/backend:db-seed` (fixtures).
2. En `C:\shared\hackaton\backend\.env`: `PERSISTENCE=postgres` y `DATABASE_URL=postgresql://...`.
3. `C:\shared\hackaton\actualizar-vm06.ps1` (el script aborta si `PERSISTENCE=postgres` y `DATABASE_URL` está vacía).
