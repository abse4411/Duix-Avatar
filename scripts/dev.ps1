# Duix.Avatar dev (hot-reload) launch script
# Usage:  .\dev.ps1
# Starts electron-vite in watch mode:
#   - renderer (Vue) changes -> instant HMR in the app window
#   - main / preload changes  -> auto rebuild and restart electron

[CmdletBinding()]
param(
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host ''
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host '  Duix.Avatar  Dev (hot-reload)' -ForegroundColor Cyan
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host "  Project: $ProjectRoot"
Write-Host "  Node:    $(node -v)"
Write-Host ''

# ---- Dependencies ----
if (-not (Test-Path 'node_modules')) {
    if ($SkipInstall) {
        Write-Host 'node_modules not found but -SkipInstall set, abort.' -ForegroundColor Red
        exit 1
    }
    Write-Host 'Installing dependencies (npm install) ...' -ForegroundColor Yellow
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Write-Host 'npm install failed' -ForegroundColor Red; exit $LASTEXITCODE }
} else {
    Write-Host 'node_modules exists, skip install.' -ForegroundColor DarkGray
}

# ---- Pre-flight checks ----
Write-Host ''
Write-Host 'Pre-flight checks:' -ForegroundColor Yellow
$ok = $true

# backend ports
foreach ($port in 8383, 18180, 7860) {
    $listening = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) -ne $null
    if ($listening) {
        Write-Host ("  port {0}: LISTENING (ok)" -f $port) -ForegroundColor Green
    } else {
        $svc = switch ($port) { 8383 {'face2face'} 18180 {'fish-speech TTS'} 7860 {'index-tts'} }
        Write-Host ("  port {0} ({1}): NOT listening" -f $port, $svc) -ForegroundColor Red
        $ok = $false
    }
}

# drive D
if (Test-Path 'D:\') {
    Write-Host '  drive D: exists (ok)' -ForegroundColor Green
} else {
    Write-Host '  drive D: NOT found (data dir D:\duix_avatar_data required)' -ForegroundColor Red
    $ok = $false
}

if (-not $ok) {
    Write-Host ''
    Write-Host 'Some pre-flight checks failed. The app will still start, but:' -ForegroundColor DarkYellow
    Write-Host '  - 8383  (face2face):   required for video synthesis' -ForegroundColor DarkYellow
    Write-Host '  - 18180 (fish-speech):  required for model-based TTS (can skip if using voice presets)' -ForegroundColor DarkYellow
    Write-Host '  - 7860  (index-tts):    required for voice preset TTS feature' -ForegroundColor DarkYellow
    Write-Host '  Start index-tts:  cd D:\mydir\index-tts; python webui.py' -ForegroundColor DarkYellow
}

Write-Host ''
Write-Host 'Starting electron-vite dev (watch mode) ...' -ForegroundColor Cyan
Write-Host '  - edit Vue files -> hot reload in window'
Write-Host '  - edit main/preload -> auto rebuild + restart'
Write-Host '  press Ctrl+C to stop'
Write-Host ''

# dev mode: NODE_ENV is set to 'development' by electron-vite automatically.
# config.js now points dev to 127.0.0.1 so it connects to your local Docker backend.
npm run dev
