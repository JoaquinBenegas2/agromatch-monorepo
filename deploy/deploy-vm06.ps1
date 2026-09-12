<#
    Deploy de AgroMatch a VM06 (IIS, sitio hackaton.vylaris.com.ar).

    Buildea LOCAL y copia los artefactos al share. NO toca la VM: no reinicia
    servicios ni configura IIS. Eso lo hace `actualizar-vm06.ps1` corriendo EN la VM.

    Uso (desde la raiz del repo o desde deploy\):
        .\deploy\deploy-vm06.ps1                # buildea back + front y copia
        .\deploy\deploy-vm06.ps1 -SkipBuild     # solo copia lo ya compilado
        .\deploy\deploy-vm06.ps1 -Solo front    # front | back
        .\deploy\deploy-vm06.ps1 -WhatIf        # muestra que haria, sin copiar

    Backend: un unico main.js autocontenido (BUNDLE_ALL=1 en webpack.config.js),
    asi la VM no necesita node_modules ni npm install.

    Base de datos: la configuracion vive en <share>\backend\.env (el mismo archivo que
    tiene la ANTHROPIC_API_KEY). Si ahi dice REPOSITORY_MODE=prisma con DATABASE_URL,
    este script — ANTES de copiar el bundle — aplica contra esa base:
      * `prisma migrate deploy`: solo las migraciones pendientes, nunca resetea ni pisa datos.
      * el seed (`prisma/seed.ts`): idempotente (createMany skipDuplicates / upsert),
        correrlo N veces deja el mismo estado y no toca lo que la gente cargo.
    Es determinista: cada deploy deja la base al dia sin reiniciarla. -SkipDb lo saltea.
    Con REPOSITORY_MODE=memory no toca ninguna base.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string] $Share = '\\vm06\shared\hackaton',
    [switch] $SkipBuild,
    [switch] $SkipDb,
    [ValidateSet('todo', 'front', 'back', 'db')]
    [string] $Solo = 'todo'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot

function Fallar($msg) { Write-Error $msg; exit 1 }
function Paso($txt) { Write-Host ''; Write-Host "==> $txt" -ForegroundColor Cyan }

if (-not (Test-Path -LiteralPath $Share)) {
    if ($PSCmdlet.ShouldProcess($Share, 'crear carpeta en el share')) {
        New-Item -Path $Share -ItemType Directory -Force | Out-Null
    }
}
Write-Host "Share destino: $Share"
Write-Host "Repo         : $RepoRoot"

$hacer = @{
    front = $Solo -in @('todo', 'front')
    back  = $Solo -in @('todo', 'back')
    db    = ($Solo -in @('todo', 'back', 'db')) -and -not $SkipDb
}

# Lee una variable del .env del share sin imprimir el resto (ahi hay secretos).
function Leer-EnvShare([string] $nombre) {
    $f = Join-Path $Share 'backend\.env'
    if (-not (Test-Path -LiteralPath $f)) { return $null }
    $l = Get-Content -LiteralPath $f | Where-Object { $_ -match "^\s*$nombre\s*=" } | Select-Object -First 1
    if (-not $l) { return $null }
    $v = ($l -split '=', 2)[1].Trim()
    if ($v.Length -ge 2 -and (($v[0] -eq '"' -and $v[-1] -eq '"') -or ($v[0] -eq "'" -and $v[-1] -eq "'"))) { $v = $v.Substring(1, $v.Length - 2) }
    return $v
}

Push-Location $RepoRoot
try {
    # ── Base de datos (migraciones + seed, idempotente) ───────────────────────
    if ($hacer.db) {
        $modo = Leer-EnvShare 'REPOSITORY_MODE'
        if (-not $modo) { $modo = 'memory' }
        if ($modo -eq 'prisma') {
            $dbUrl = Leer-EnvShare 'DATABASE_URL'
            if (-not $dbUrl) { Fallar 'db - REPOSITORY_MODE=prisma pero DATABASE_URL esta vacia en backend\.env del share.' }
            if ($dbUrl -notmatch '^postgres(ql)?://') { Fallar 'db - DATABASE_URL tiene que ser postgresql://... (el backend la rechaza si no).' }
            if ($dbUrl -match '\.railway\.internal') { Fallar 'db - DATABASE_URL usa el host INTERNO de Railway (*.railway.internal): solo resuelve dentro de Railway. Usar la URL publica (Connect -> Public Network, *.proxy.rlwy.net:<puerto>).' }
            $hostDb = ($dbUrl -replace '^[a-z]+://[^@]*@', '') -replace '/.*$', ''
            Paso "db - migraciones + seed contra $hostDb"
            if ($PSCmdlet.ShouldProcess($hostDb, 'prisma migrate deploy + seed')) {
                $env:DATABASE_URL = $dbUrl
                try {
                    # migrate deploy: aplica SOLO lo pendiente; no genera migraciones ni resetea.
                    npx prisma migrate deploy --config apps/backend/prisma7.config.ts
                    if ($LASTEXITCODE -ne 0) { Fallar "db - prisma migrate deploy fallo (exit $LASTEXITCODE)" }
                    # seed idempotente (createMany skipDuplicates / upsert): no pisa datos cargados.
                    npx tsx apps/backend/prisma/seed.ts
                    if ($LASTEXITCODE -ne 0) { Fallar "db - seed fallo (exit $LASTEXITCODE)" }
                } finally {
                    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
                }
                Write-Host "    base al dia en $hostDb (migraciones pendientes aplicadas, seed verificado)" -ForegroundColor Green
            }
        } else {
            Paso "db - REPOSITORY_MODE=${modo}: sin base, no hay nada que migrar"
        }
    }

    # ── Front (Vite) ─────────────────────────────────────────────────────────
    if ($hacer.front) {
        if (-not $SkipBuild) {
            Paso 'front - build'
            npx nx build frontend --skip-nx-cache
            if ($LASTEXITCODE -ne 0) { Fallar "front - nx build fallo (exit $LASTEXITCODE)" }
        }
        $dist = Join-Path $RepoRoot 'apps\frontend\dist'
        if (-not (Test-Path (Join-Path $dist 'index.html'))) { Fallar "front - no existe $dist\index.html. Corre sin -SkipBuild." }

        Paso 'front - copia'
        $dest = Join-Path $Share 'front'
        if ($PSCmdlet.ShouldProcess($dest, "espejar desde $dist")) {
            New-Item -Path $dest -ItemType Directory -Force | Out-Null
            # /MIR borra lo que sobra: los bundles llevan hash, sin espejar se acumulan.
            robocopy $dist $dest /MIR /NFL /NDL /NJH /NJS /R:2 /W:2 | Out-Null
            if ($LASTEXITCODE -ge 8) { Fallar "front - robocopy fallo (exit $LASTEXITCODE)" }
            # El web.config viaja DENTRO de front\ para sobrevivir al /MIR de la VM.
            Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'web.config.front') -Destination (Join-Path $dest 'web.config') -Force
            $n = (Get-ChildItem -LiteralPath $dest -Recurse -File).Count
            Write-Host "    front -> $dest  ($n archivos, web.config incluido)" -ForegroundColor Green
        }
    }

    # ── Back (Nest, bundle unico) ────────────────────────────────────────────
    if ($hacer.back) {
        if (-not $SkipBuild) {
            Paso 'back - build (bundle autocontenido)'
            $env:BUNDLE_ALL = '1'
            $env:NODE_ENV   = 'production'
            try {
                npx nx build backend --skip-nx-cache
                if ($LASTEXITCODE -ne 0) { Fallar "back - nx build fallo (exit $LASTEXITCODE)" }
            } finally {
                Remove-Item Env:\BUNDLE_ALL -ErrorAction SilentlyContinue
                Remove-Item Env:\NODE_ENV   -ErrorAction SilentlyContinue
            }
        }
        $main = Join-Path $RepoRoot 'apps\backend\dist\main.js'
        if (-not (Test-Path $main)) { Fallar "back - no existe $main. Corre sin -SkipBuild." }
        # Un bundle chico es un bundle con externals: no va a correr en la VM.
        if ((Get-Item $main).Length -lt 2MB) { Fallar 'back - main.js pesa menos de 2 MB: se compilo SIN BUNDLE_ALL=1 (deja @nestjs/@org externos).' }

        Paso 'back - copia'
        $dest = Join-Path $Share 'backend'
        if ($PSCmdlet.ShouldProcess("$dest\main.js", 'copiar bundle')) {
            New-Item -Path $dest -ItemType Directory -Force | Out-Null
            Copy-Item -LiteralPath $main -Destination (Join-Path $dest 'main.js') -Force
            $i = Get-Item (Join-Path $dest 'main.js')
            Write-Host ("    back -> {0}  ({1:N1} MB)" -f $i.FullName, ($i.Length / 1MB)) -ForegroundColor Green
            # La plantilla del .env se deja SOLO si no existe: ahi vive la ANTHROPIC_API_KEY y no se pisa.
            $envShare = Join-Path $dest '.env'
            if (-not (Test-Path -LiteralPath $envShare)) {
                Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'backend.env.example') -Destination $envShare -Force
                Write-Host "    backend\.env creado desde la plantilla: pegar la ANTHROPIC_API_KEY ahi" -ForegroundColor Yellow
            } else {
                Write-Host "    backend\.env ya existe en el share: se conserva" -ForegroundColor Green
            }
        }
    }

    # ── Scripts y doc para el lado VM ────────────────────────────────────────
    Paso 'scripts de la VM'
    foreach ($f in 'actualizar-vm06.ps1', 'https-binding-vm06.ps1', 'LEEME-vm06.md') {
        $src = Join-Path $PSScriptRoot $f
        if ($PSCmdlet.ShouldProcess((Join-Path $Share $f), "copiar $f")) {
            Copy-Item -LiteralPath $src -Destination (Join-Path $Share $f) -Force
            Write-Host "    $f" -ForegroundColor Green
        }
    }
} finally { Pop-Location }

Paso 'Listo'
Write-Host 'Copiado. Del lado de VM06 (PowerShell como administrador):' -ForegroundColor Yellow
Write-Host '    C:\shared\hackaton\actualizar-vm06.ps1'
Write-Host 'La config (ANTHROPIC_API_KEY, REPOSITORY_MODE, DATABASE_URL) vive en \\vm06\shared\hackaton\backend\.env' -ForegroundColor Yellow
