<#
    Agrega el binding HTTPS (443, SNI) al sitio hackaton.vylaris.com.ar en IIS,
    reutilizando el certificado que ya usan los otros subdominios *.vylaris.com.ar
    (Cloudflare habla con el origen por 443: sin este binding, https:// da 404
    porque la request cae en otro sitio de la VM).

    Correr EN LA VM, en PowerShell como administrador:
        C:\shared\hackaton\https-binding-vm06.ps1
        C:\shared\hackaton\https-binding-vm06.ps1 -Thumbprint '<hash>'   # para forzar un certificado puntual
        C:\shared\hackaton\https-binding-vm06.ps1 -Check                 # solo lista certificados y bindings
#>
[CmdletBinding()]
param(
    [string] $Sitio    = 'hackaton.vylaris.com.ar',
    [string] $HostName = 'hackaton.vylaris.com.ar',
    [string] $Thumbprint,
    [switch] $Check
)

$ErrorActionPreference = 'Stop'
function Paso($t) { Write-Host ''; Write-Host "==> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "    OK  $t" -ForegroundColor Green }
function Aviso($t){ Write-Host "    !   $t" -ForegroundColor Yellow }
function Morir($t){ Write-Host "    X   $t" -ForegroundColor Red; exit 1 }

Import-Module WebAdministration

Paso 'Bindings HTTPS que ya existen en la VM (para ver que certificado usan los *.vylaris.com.ar)'
$httpsBindings = Get-WebBinding -Protocol https
$enUso = @{}
foreach ($b in $httpsBindings) {
    $hostB = ($b.bindingInformation -split ':')[2]
    $hash  = $b.certificateHash
    if ($hash) { $enUso[$hash] = $hostB }
    "    {0,-45} {1}" -f $hostB, $hash
}

Paso 'Certificados en LocalMachine\My que cubren vylaris.com.ar'
$certs = Get-ChildItem Cert:\LocalMachine\My | Where-Object {
    $_.Subject -match 'vylaris\.com\.ar' -or ($_.DnsNameList | Where-Object { $_.Unicode -match 'vylaris\.com\.ar' })
} | Sort-Object NotAfter -Descending
foreach ($c in $certs) {
    $sans = ($c.DnsNameList | ForEach-Object { $_.Unicode }) -join ', '
    $tag  = if ($enUso.ContainsKey($c.Thumbprint)) { " (en uso por $($enUso[$c.Thumbprint]))" } else { '' }
    "    {0}  vence {1:yyyy-MM-dd}  {2}{3}" -f $c.Thumbprint, $c.NotAfter, $sans, $tag
}
if ($Check) { exit 0 }

# Elegir certificado: el pasado por parametro; si no, uno que cubra el host (wildcard o exacto),
# prefiriendo el que ya usan otros sitios; si no, el que use cualquier *.vylaris.com.ar.
$cert = $null
if ($Thumbprint) {
    $cert = Get-Item "Cert:\LocalMachine\My\$Thumbprint" -ErrorAction SilentlyContinue
    if (-not $cert) { Morir "No existe el certificado $Thumbprint en LocalMachine\My" }
} else {
    $cubre = $certs | Where-Object {
        ($_.DnsNameList | Where-Object { $_.Unicode -eq $HostName -or $_.Unicode -eq '*.vylaris.com.ar' }) -or
        $_.Subject -match '\*\.vylaris\.com\.ar'
    }
    $cert = $cubre | Where-Object { $enUso.ContainsKey($_.Thumbprint) } | Select-Object -First 1
    if (-not $cert) { $cert = $cubre | Select-Object -First 1 }
    if (-not $cert) {
        $hashLab = $httpsBindings | Where-Object { $_.bindingInformation -match 'vylaris\.com\.ar' } | Select-Object -First 1 -ExpandProperty certificateHash
        if ($hashLab) { $cert = Get-Item "Cert:\LocalMachine\My\$hashLab" -ErrorAction SilentlyContinue; Aviso 'Ningun certificado cubre el host explicitamente; se reutiliza el de otro *.vylaris.com.ar (funciona si es el Origin Cert wildcard de Cloudflare).' }
    }
    if (-not $cert) { Morir "No encontre un certificado para $HostName. Emitir uno (Cloudflare Origin Certificate wildcard *.vylaris.com.ar) y pasar -Thumbprint." }
}
Ok "certificado elegido: $($cert.Thumbprint) ($($cert.Subject), vence $($cert.NotAfter.ToString('yyyy-MM-dd')))"

Paso "Binding 443 con SNI para $Sitio"
$site = Get-Website -Name $Sitio -ErrorAction SilentlyContinue
if (-not $site) { Morir "No existe el sitio IIS '$Sitio'" }
$existe = Get-WebBinding -Name $Sitio -Protocol https | Where-Object { $_.bindingInformation -eq "*:443:$HostName" }
if (-not $existe) {
    New-WebBinding -Name $Sitio -Protocol https -Port 443 -HostHeader $HostName -SslFlags 1
    Ok 'binding creado'
} else { Ok 'binding ya existia' }
$binding = Get-WebBinding -Name $Sitio -Protocol https | Where-Object { $_.bindingInformation -eq "*:443:$HostName" }
$binding.AddSslCertificate($cert.Thumbprint, 'my')
Ok 'certificado asociado (SNI)'

Paso 'Verificacion'
$b = Get-WebBinding -Name $Sitio | ForEach-Object { "    " + $_.protocol + '  ' + $_.bindingInformation + '  ' + $_.certificateHash }
$b
Write-Host ''
Write-Host 'Probar desde afuera: https://hackaton.vylaris.com.ar/  (Ctrl+Shift+R).' -ForegroundColor Yellow
Write-Host 'Si sigue 404 por https, revisar en Cloudflare que el registro DNS apunte a la misma IP que labtrace-lis.' -ForegroundColor Yellow
