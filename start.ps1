$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed. Install Node.js 22 from https://nodejs.org and run this file again." -ForegroundColor Red
  exit 1
}

node scripts/launch.mjs
