<#
    Actualiza AgroMatch en VM06 con lo que haya en el share.

    Antes de la primera vez: pegar la ANTHROPIC_API_KEY en C:\shared\hackaton\backend\.env

    Correr EN LA VM, en PowerShell como administrador:
        C:\shared\hackaton\actualizar-vm06.ps1                              # deploy / redeploy completo
        C:\shared\hackaton\actualizar-vm06.ps1 -SoloFront                   # cambio solo el front, no corta el backend
        C:\shared\hackaton\actualizar-vm06.ps1 -Check                       # solo diagnostica, no toca nada
        C:\shared\hackaton\actualizar-vm06.ps1 -AnthropicKey 'sk-ant-...'   # fuerza la key por parametro (pisa la del .env)

    Que hace:
      1. Verifica Node, NSSM, el sitio IIS y que el puerto del backend este libre (o sea nuestro).
      2. Espeja share\front -> C:\apps\hackaton\front (lo que sirve el sitio IIS ya creado).
      3. Copia share\backend\main.js -> C:\apps\hackaton\backend\main.js.
      4. Registra (o actualiza) el servicio NSSM `HackatonApi`: node main.js con
         REPOSITORY_MODE=memory (sin base de datos, fixtures en memoria), AI_MODE=live, PORT=8095.
      5. Habilita el proxy de ARR y las server variables que usa el web.config.
      6. Levanta el servicio y verifica: health del backend, y /api A TRAVES del sitio IIS.

    Es idempotente: se puede correr las veces que haga falta.
#>
[CmdletBinding()]
param(
    [string] $Share     = 'C:\shared\hackaton',
    [string] $Destino   = 'C:\apps\hackaton',
    [string] $Servicio  = 'HackatonApi',
    [string] $Sitio     = 'hackaton.vylaris.com.ar',
    [string] $HostName  = 'hackaton.vylaris.com.ar',
    [int]    $Puerto    = 8095,
    [string] $Nssm      = 'C:\apps\nssm\nssm.exe',
    [string] $AnthropicKey,
    [switch] $SoloFront,
    [switch] $Check
)

$ErrorActionPreference = 'Stop'

function Paso($t) { Write-Host ''; Write-Host "==> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "    OK  $t" -ForegroundColor Green }
function Aviso($t){ Write-Host "    !   $t" -ForegroundColor Yellow }
function Morir($t){ Write-Host "    X   $t" -ForegroundColor Red; exit 1 }

# El DNS de VM06 no resuelve algunos dominios (p. ej. *.proxy.rlwy.net de Railway) aunque la
# salida TCP funcione. Si el host de la base no resuelve localmente, se resuelve por un DNS
# publico y se fija en el archivo hosts (una sola linea, marcada, se actualiza si cambia la IP).
function Asegurar-ResolucionDb([string] $dbHost, [int] $dbPort) {
    Paso "Resolucion DNS de la base ($dbHost)"
    if ($dbHost -match '^\d+\.\d+\.\d+\.\d+$') { Ok 'es una IP, no hay nada que resolver'; return }
    if ($dbHost -match '\.railway\.internal$') { Morir "DATABASE_URL usa el host INTERNO de Railway ($dbHost): solo resuelve dentro de Railway. Usar la URL publica (*.proxy.rlwy.net:<puerto>)." }

    $local = Resolve-DnsName $dbHost -ErrorAction SilentlyContinue | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1
    $hostsFile = "$env:windir\System32\drivers\etc\hosts"
    $marca = '# hackaton-db (actualizar-vm06.ps1)'
    if ($local) {
        Ok "resuelve por el DNS de la VM: $($local.IPAddress)"
    } else {
        $publico = $null
        foreach ($dns in '8.8.8.8', '1.1.1.1') {
            $r = Resolve-DnsName $dbHost -Server $dns -ErrorAction SilentlyContinue | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1
            if ($r) { $publico = $r.IPAddress; break }
        }
        if (-not $publico) { Morir "$dbHost no resuelve ni con DNS publico. Revisar la URL." }
        $lineas = Get-Content -LiteralPath $hostsFile -ErrorAction SilentlyContinue
        $nuevas = @($lineas | Where-Object { $_ -notmatch [regex]::Escape($marca) })
        $nuevas += "$publico`t$dbHost`t$marca"
        Set-Content -LiteralPath $hostsFile -Value $nuevas -Encoding ASCII
        ipconfig /flushdns | Out-Null
        Ok "el DNS de la VM no lo conoce: fijado en hosts -> $publico $dbHost"
    }

    $tcp = Test-NetConnection $dbHost -Port $dbPort -WarningAction SilentlyContinue -InformationLevel Quiet
    if ($tcp) { Ok "TCP ${dbHost}:$dbPort abierto" } else { Morir "No hay salida TCP a ${dbHost}:$dbPort desde la VM (firewall). El backend no va a poder conectarse." }
}

# ── 1. Diagnostico ───────────────────────────────────────────────────────────
Paso 'Diagnostico'
if (-not (Test-Path -LiteralPath $Share)) { Morir "No encuentro el share: $Share" }
Ok "share: $Share"

$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node -and (Test-Path 'C:\Program Files\nodejs\node.exe')) { $node = 'C:\Program Files\nodejs\node.exe' }
if (-not $node) { Morir 'No encuentro node.exe (ni en PATH ni en C:\Program Files\nodejs).' }
Ok "node: $node ($(& $node -v))"

if (-not (Test-Path -LiteralPath $Nssm)) { Morir "No encuentro NSSM en $Nssm (pasar -Nssm <ruta>)." }
Ok "nssm: $Nssm"

Import-Module WebAdministration -ErrorAction Stop
$site = Get-Website -Name $Sitio -ErrorAction SilentlyContinue
if (-not $site) { Morir "No existe el sitio IIS '$Sitio'. Se creo con otro nombre? (Get-Website | ft Name,PhysicalPath)" }
Ok "sitio IIS: $($site.Name) [$($site.State)] -> $($site.PhysicalPath)"
$frontDir = [Environment]::ExpandEnvironmentVariables($site.PhysicalPath)
if ($frontDir -ne (Join-Path $Destino 'front')) {
    Aviso "El sitio apunta a '$frontDir', no a '$Destino\front'. Se copia el front donde apunta el sitio."
}

$svc = Get-Service $Servicio -ErrorAction SilentlyContinue
$listener = Get-NetTCPConnection -State Listen -LocalPort $Puerto -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $dueno = (Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue)
    $esNuestro = $svc -and $dueno -and ($dueno.ProcessName -eq 'node')
    if ($esNuestro) { Ok "puerto $Puerto en uso por nuestro backend (pid $($listener.OwningProcess))" }
    else { Morir "El puerto $Puerto ya esta en uso por '$($dueno.ProcessName)' (pid $($listener.OwningProcess)). Elegir otro con -Puerto y cambiar el web.config." }
} else {
    $binding = Get-WebBinding | Where-Object { ($_.bindingInformation -split ':')[1] -eq "$Puerto" }
    if ($binding) { Morir "El puerto $Puerto esta reservado por un binding de IIS. Elegir otro con -Puerto y cambiar el web.config." }
    Ok "puerto $Puerto libre"
}
if ($svc) { Ok "servicio $Servicio existe [$($svc.Status)]" } else { Aviso "servicio $Servicio no existe todavia: se crea" }

if ($Check) { Write-Host ''; Write-Host 'Solo diagnostico. Nada tocado.' -ForegroundColor Yellow; exit 0 }

# ── 2. Front ─────────────────────────────────────────────────────────────────
Paso 'Front'
$srcFront = Join-Path $Share 'front'
if (-not (Test-Path (Join-Path $srcFront 'index.html'))) { Morir "No hay front\index.html en el share. Corre deploy-vm06.ps1 desde la maquina dev." }
New-Item -Path $frontDir -ItemType Directory -Force | Out-Null
# /MIR a proposito: los bundles llevan hash, sin espejar se acumulan chunks viejos.
# El web.config viene DENTRO de front\ justamente para sobrevivir a esto.
robocopy $srcFront $frontDir /MIR /NFL /NDL /NJH /NJS /R:2 /W:2 | Out-Null
if ($LASTEXITCODE -ge 8) { Morir "front - robocopy fallo (exit $LASTEXITCODE)" }
$n = (Get-ChildItem -LiteralPath $frontDir -Recurse -File).Count
if (Test-Path (Join-Path $frontDir 'web.config')) { Ok "$n archivos en $frontDir, web.config presente" }
else { Morir "FALTA web.config en ${frontDir}: /api y los deep links van a fallar." }

# El web.config tiene el puerto del backend hardcodeado: si se cambio por parametro, se ajusta.
$wc = Join-Path $frontDir 'web.config'
$xml = Get-Content -LiteralPath $wc -Raw
if ($xml -notmatch "localhost:${Puerto}/") {
    $xml = $xml -replace 'http://localhost:\d+/api', "http://localhost:$Puerto/api"
    Set-Content -LiteralPath $wc -Value $xml -Encoding UTF8
    Aviso "web.config: regla /api apuntada a localhost:$Puerto"
}

if ($SoloFront) {
    Paso 'Verificacion (solo front)'
    $r = Invoke-WebRequest "http://localhost/" -Headers @{ Host = $HostName } -UseBasicParsing -TimeoutSec 15
    Ok "$($r.StatusCode) http://$HostName/"
    exit 0
}

# ── 3. Backend: bundle ───────────────────────────────────────────────────────
Paso 'Backend'
$srcMain = Join-Path $Share 'backend\main.js'
if (-not (Test-Path $srcMain)) { Morir "No hay backend\main.js en el share. Corre deploy-vm06.ps1 desde la maquina dev." }
$backDir = Join-Path $Destino 'backend'
New-Item -Path "$backDir\logs" -ItemType Directory -Force | Out-Null

if ($svc -and $svc.Status -eq 'Running') {
    Stop-Service $Servicio -Force
    (Get-Service $Servicio).WaitForStatus('Stopped', '00:00:30')
    Ok 'servicio detenido'
}
# Se copian todos los *.js del share (main.js y, si los hubiera, chunks). Archivo por archivo:
# un /MIR sobre esta carpeta borraria logs y .env.
Get-ChildItem (Join-Path $Share 'backend') -Filter '*.js' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $backDir $_.Name) -Force
}
$i = Get-Item (Join-Path $backDir 'main.js')
Ok ('main.js {0:N1} MB  {1}' -f ($i.Length / 1MB), $i.LastWriteTime)

# .env: vive en el share (backend\.env, ahi se pega la ANTHROPIC_API_KEY) y se copia
# junto al main.js; el bundle lo lee al arrancar (dotenv) desde su AppDirectory.
$srcEnv  = Join-Path $Share 'backend\.env'
$destEnv = Join-Path $backDir '.env'
$keyEnv  = $null
if (Test-Path -LiteralPath $srcEnv) {
    Copy-Item -LiteralPath $srcEnv -Destination $destEnv -Force
    $linea = Get-Content -LiteralPath $srcEnv | Where-Object { $_ -match '^\s*ANTHROPIC_API_KEY\s*=' } | Select-Object -First 1
    if ($linea) { $keyEnv = ($linea -split '=', 2)[1].Trim().Trim('"') }
    Ok ".env copiado a $destEnv"
} elseif (Test-Path -LiteralPath $destEnv) {
    Aviso "No hay backend\.env en el share; se conserva el que ya estaba en $destEnv"
    $linea = Get-Content -LiteralPath $destEnv | Where-Object { $_ -match '^\s*ANTHROPIC_API_KEY\s*=' } | Select-Object -First 1
    if ($linea) { $keyEnv = ($linea -split '=', 2)[1].Trim().Trim('"') }
} else {
    Aviso "No hay backend\.env ni en el share ni en $backDir"
}

# ── 4. Servicio NSSM ─────────────────────────────────────────────────────────
Paso "Servicio $Servicio (NSSM)"
if (-not $svc) {
    & $Nssm install $Servicio $node 'main.js' | Out-Null
    if ($LASTEXITCODE -ne 0) { Morir "nssm install fallo (exit $LASTEXITCODE)" }
    Ok 'servicio creado'
}
& $Nssm set $Servicio Application     $node            | Out-Null
& $Nssm set $Servicio AppParameters   'main.js'        | Out-Null
& $Nssm set $Servicio AppDirectory    $backDir         | Out-Null
& $Nssm set $Servicio DisplayName     'AgroMatch API (hackaton.vylaris.com.ar)' | Out-Null
& $Nssm set $Servicio Description     'Backend NestJS de AgroMatch. Perfil (memory | prisma) y secretos en C:\apps\hackaton\backend\.env.' | Out-Null
& $Nssm set $Servicio Start           SERVICE_AUTO_START | Out-Null
& $Nssm set $Servicio AppStdout       "$backDir\logs\stdout.log" | Out-Null
& $Nssm set $Servicio AppStderr       "$backDir\logs\stderr.log" | Out-Null
& $Nssm set $Servicio AppRotateFiles  1 | Out-Null
& $Nssm set $Servicio AppRotateBytes  10485760 | Out-Null
& $Nssm set $Servicio AppStopMethodSkip 0 | Out-Null
& $Nssm set $Servicio AppStopMethodConsole 5000 | Out-Null
& $Nssm set $Servicio AppExit Default Restart | Out-Null
& $Nssm set $Servicio AppRestartDelay 3000 | Out-Null

# Variables de entorno del servicio. Solo el puerto (tiene que coincidir con el web.config)
# y NODE_ENV. Todo lo demas — REPOSITORY_MODE (memory | prisma), DATABASE_URL, AI_MODE,
# ANTHROPIC_API_KEY — sale del .env: cambiar de memoria a Postgres es editar ese archivo
# y volver a correr este script. dotenv NO pisa lo que ya viene del entorno, por eso
# el puerto se fija aca y no en el .env. -AnthropicKey fuerza la key por encima del .env.
$key = $AnthropicKey
if (-not $key -and $keyEnv) { $key = $keyEnv }
if (-not $key) { Aviso 'Sin ANTHROPIC_API_KEY: el backend arranca, pero todo lo que usa Claude va a devolver 502 LLM_UNAVAILABLE. Pegala en backend\.env del share.' }
if ($key -and $key -notmatch '^sk-ant-') { Aviso 'La key no empieza con "sk-ant-". Seguimos, pero revisala.' }

$perfil = 'memory'
$fuenteEnv = if (Test-Path -LiteralPath $destEnv) { $destEnv } else { $null }
if ($fuenteEnv) {
    $lp = Get-Content -LiteralPath $fuenteEnv | Where-Object { $_ -match '^\s*REPOSITORY_MODE\s*=' } | Select-Object -First 1
    if ($lp) { $perfil = ($lp -split '=', 2)[1].Trim().Trim('"') }
    if ($perfil -notin @('memory', 'prisma')) { Morir "REPOSITORY_MODE='$perfil' no es valido: tiene que ser memory o prisma." }
    if ($perfil -eq 'prisma') {
        $ld = Get-Content -LiteralPath $fuenteEnv | Where-Object { $_ -match '^\s*DATABASE_URL\s*=\s*\S' } | Select-Object -First 1
        if (-not $ld) { Morir 'REPOSITORY_MODE=prisma pero DATABASE_URL esta vacia en el .env: el backend no va a arrancar.' }
        $dbUrl  = (($ld -split '=', 2)[1]).Trim().Trim('"').Trim("'")
        $dbHost = (($dbUrl -replace '^[a-z]+://[^@]*@', '') -replace '[:/].*$', '')
        $dbPort = 5432
        if ($dbUrl -match '@[^/:]+:(\d+)') { $dbPort = [int]$Matches[1] }
        Asegurar-ResolucionDb $dbHost $dbPort
    }
}

$vars = @(
    "PORT=$Puerto",
    'NODE_ENV=production'
)
if ($AnthropicKey) { $vars += "ANTHROPIC_API_KEY=$AnthropicKey" }
& $Nssm set $Servicio AppEnvironmentExtra $vars | Out-Null
if ($LASTEXITCODE -ne 0) { Morir "nssm set AppEnvironmentExtra fallo (exit $LASTEXITCODE)" }
Ok ('entorno: REPOSITORY_MODE={0} (.env) PORT={1} ANTHROPIC_API_KEY={2}' -f $perfil, $Puerto, $(if ($key) { '...' + $key.Substring($key.Length - 4) + $(if ($AnthropicKey) { ' (parametro)' } else { ' (.env)' }) } else { '(vacia)' }))

# ── 5. ARR: proxy + server variables (idempotente) ───────────────────────────
Paso 'ARR / URL Rewrite'
$appcmd = "$env:windir\system32\inetsrv\appcmd.exe"
& $appcmd set config -section:system.webServer/proxy /enabled:"True" /commit:apphost | Out-Null
foreach ($v in 'HTTP_X_FORWARDED_HOST', 'HTTP_X_FORWARDED_PROTO') {
    $ya = & $appcmd list config "$Sitio" -section:system.webServer/rewrite/allowedServerVariables /text:* 2>$null | Select-String $v
    if (-not $ya) {
        & $appcmd set config "$Sitio" -section:system.webServer/rewrite/allowedServerVariables /+"[name='$v']" /commit:apphost | Out-Null
    }
}
Ok 'proxy ARR habilitado y server variables permitidas'

# ── 6. Levantar y verificar ──────────────────────────────────────────────────
Paso 'Levantando el backend'
Start-Service $Servicio
$arriba = $false
foreach ($k in 1..40) {
    Start-Sleep -Seconds 2
    try {
        # GET /api sin header responde 401 (USER_HEADER_MISSING): /me con x-user-id es el health real.
        $r = Invoke-WebRequest "http://localhost:$Puerto/api/me" -Headers @{ 'x-user-id' = 'tambero-a' } -UseBasicParsing -TimeoutSec 4
        if ($r.StatusCode -eq 200) { $arriba = $true; Ok "backend responde en localhost:$Puerto a los $($k*2)s"; break }
    } catch { }
}
if (-not $arriba) {
    Write-Host ''
    Write-Host '    Ultimas lineas de stderr.log:' -ForegroundColor Red
    Get-Content "$backDir\logs\stderr.log" -Tail 30 -ErrorAction SilentlyContinue
    Morir "El backend no respondio en 80s. Revisar $backDir\logs\"
}

Paso 'Verificacion a traves del sitio IIS'
$h = @{ Host = $HostName; 'x-user-id' = 'tambero-a' }
try {
    $r = Invoke-WebRequest 'http://localhost/' -Headers @{ Host = $HostName } -UseBasicParsing -TimeoutSec 15
    Ok "$($r.StatusCode) http://$HostName/  (front)"
} catch { Morir "El front no responde por IIS: $($_.Exception.Message)" }
try {
    $r = Invoke-WebRequest 'http://localhost/api/me' -Headers $h -UseBasicParsing -TimeoutSec 15
    if ($r.Content -match '^\s*<') { Morir '/api/me devolvio HTML: la regla /api quedo debajo del fallback SPA o ARR no esta proxyando.' }
    Ok "$($r.StatusCode) http://$HostName/api/me -> $($r.Content.Substring(0, [Math]::Min(80, $r.Content.Length)))"
} catch { Morir "/api no llega al backend a traves de IIS: $($_.Exception.Message)  (502 = ARR sin proxy o backend caido)" }
try {
    $r = Invoke-WebRequest 'http://localhost/api/bulls' -Headers $h -UseBasicParsing -TimeoutSec 15
    $cant = (($r.Content | ConvertFrom-Json) | Measure-Object).Count
    Ok "$($r.StatusCode) http://$HostName/api/bulls -> $cant toros"
} catch { Aviso "/api/bulls: $($_.Exception.Message)" }
try {
    $r = Invoke-WebRequest 'http://localhost/motor-genetico/tablero' -Headers @{ Host = $HostName } -UseBasicParsing -TimeoutSec 15
    Ok "$($r.StatusCode) deep link /motor-genetico/tablero (fallback SPA)"
} catch { Aviso "deep link: $($_.Exception.Message)" }

Write-Host ''
Write-Host "Listo. Abrir http://$HostName/ (Ctrl+Shift+R para descartar cache)." -ForegroundColor Yellow
Write-Host "Logs del backend: $backDir\logs\   Reiniciar: Restart-Service $Servicio" -ForegroundColor Yellow
if ($perfil -eq 'memory') { Write-Host 'Recorda: REPOSITORY_MODE=memory -> lo que se carga o clasifica se pierde al reiniciar el servicio.' -ForegroundColor Yellow }
