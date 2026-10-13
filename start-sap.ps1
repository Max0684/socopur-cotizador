#Requires -Version 5.1
<#
  Arranca el Cotizador en local con el proxy hacia SAP Socopur DS4 (mandante 130 por defecto, -Client lo cambia) por el tunel HTTPS.
    .\start-sap.ps1 -Url https://<host-del-tunel>
  Pide usuario y contrasena por consola; solo viven en variables de entorno de este proceso.
  Ojo: cada peticion lleva las credenciales; si la contrasena es incorrecta, SAP puede bloquear el usuario.
  Para en el primer 401 (Ctrl+C) y no lo repitas.
#>
param(
    [Parameter(Mandatory)] [string]$Url,
    [string]$Client = "130"
)

$ErrorActionPreference = 'Stop'
if ($Url -notmatch '^https://') { Write-Host "La URL debe empezar con https://" -ForegroundColor Red; exit 1 }
if ($Url -match '[<>]') { Write-Host "Pon la URL real del tunel, sin < >." -ForegroundColor Red; exit 1 }

$user = Read-Host 'Usuario SAP'
if (-not $user) { Write-Host "Cancelado."; exit 1 }
$sec = Read-Host 'Contrasena' -AsSecureString
if ($sec.Length -eq 0) { Write-Host "Cancelado."; exit 1 }
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$env:UI5_MIDDLEWARE_SIMPLE_PROXY_BASEURI  = ($Url.TrimEnd('/') + '/sap')
$env:UI5_MIDDLEWARE_SIMPLE_PROXY_USERNAME = $user
$env:UI5_MIDDLEWARE_SIMPLE_PROXY_PASSWORD = $plain
try {
    Push-Location $PSScriptRoot
    # Config local con el mandante elegido (ui5-sap.local.yaml no se versiona)
    (Get-Content 'ui5-sap.yaml' -Raw) -replace 'sap-client: "\d+"', "sap-client: `"$Client`"" | Set-Content 'ui5-sap.local.yaml' -Encoding UTF8
    Write-Host "Mandante SAP: $Client" -ForegroundColor Cyan
    npx ui5 serve --config ui5-sap.local.yaml --open "index.html?odata=1"
}
finally {
    Pop-Location
    Remove-Item Env:UI5_MIDDLEWARE_SIMPLE_PROXY_BASEURI, Env:UI5_MIDDLEWARE_SIMPLE_PROXY_USERNAME, Env:UI5_MIDDLEWARE_SIMPLE_PROXY_PASSWORD -ErrorAction SilentlyContinue
    $plain = $null
}
