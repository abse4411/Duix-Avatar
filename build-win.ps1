# Duix.Avatar Windows installer build script
# Usage:  .\build-win.ps1
# Options:
#   -SkipInstall   skip dependency check/install (faster when deps already installed)
#   -Clean         clean out/ and dist/ before building

[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host ''
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host '  Duix.Avatar  Windows Build' -ForegroundColor Cyan
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host "  Project: $ProjectRoot"
Write-Host "  Node:    $(node -v)"
Write-Host "  npm:     $(npm -v)"
Write-Host ''

# ---- Clean ----
if ($Clean) {
    Write-Host '[1/4] Cleaning old output (out/ dist/) ...' -ForegroundColor Yellow
    foreach ($d in 'out', 'dist') {
        if (Test-Path $d) {
            Remove-Item $d -Recurse -Force
            Write-Host "      removed $d"
        }
    }
} else {
    Write-Host '[1/4] Skip clean (use -Clean to remove old output)' -ForegroundColor DarkGray
}

# ---- Dependencies ----
Write-Host '[2/4] Checking dependencies ...' -ForegroundColor Yellow
if (-not (Test-Path 'node_modules')) {
    if ($SkipInstall) {
        Write-Host '      node_modules not found but -SkipInstall set, abort.' -ForegroundColor Red
        exit 1
    }
    Write-Host '      node_modules not found, running npm install ...'
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Write-Host 'npm install failed' -ForegroundColor Red; exit $LASTEXITCODE }
} else {
    if ($SkipInstall) {
        Write-Host '      skip dependency check (-SkipInstall)'
    } else {
        Write-Host '      node_modules exists, skip install (delete it to force reinstall)'
    }
}

# ---- Mirror ----
Write-Host '[3/4] Setting mirrors for faster download ...' -ForegroundColor Yellow
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'

# ---- Build ----
Write-Host '[4/4] Building (npm run build:win) ...' -ForegroundColor Yellow
Write-Host '      electron-vite build  +  electron-builder --win'
Write-Host ''
npm run build:win
if ($LASTEXITCODE -ne 0) { Write-Host 'Build failed' -ForegroundColor Red; exit $LASTEXITCODE }

# ---- Output ----
Write-Host ''
Write-Host '==========================================' -ForegroundColor Green
Write-Host '  Build succeeded!' -ForegroundColor Green
Write-Host '==========================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Artifacts:' -ForegroundColor Green

$setup = Join-Path $ProjectRoot 'dist\Duix.Avatar-1.0.6-setup.exe'
$unpacked = Join-Path $ProjectRoot 'dist\win-unpacked\Duix.Avatar.exe'

if (Test-Path $setup) {
    $size = [math]::Round((Get-Item $setup).Length / 1MB, 2)
    Write-Host ("  Installer : {0}  ({1} MB)" -f $setup, $size) -ForegroundColor White
}
if (Test-Path $unpacked) {
    $size = [math]::Round((Get-Item $unpacked).Length / 1MB, 2)
    Write-Host ("  Unpacked  : {0}  ({1} MB)" -f $unpacked, $size) -ForegroundColor White
}

Write-Host ''
Write-Host 'Prerequisites before running:' -ForegroundColor Cyan
Write-Host '  - Docker backend services running: fun-asr / fish-speech-ziming(:18180) / duix.avatar(:8383)'
Write-Host '  - Drive D: required, data dir D:\duix_avatar_data\ (free > 30GB)'
Write-Host '  - NVIDIA GPU driver OK'
Write-Host ''
