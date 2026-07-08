# Instalador do co-panel (Windows). Baixa do repo, builda e cria o atalho na Área de Trabalho.
# Uso (PowerShell): irm https://raw.githubusercontent.com/LuccasGavarron/co-panel/main/scripts/install.ps1 | iex
$ErrorActionPreference = "Stop"

$repo = "https://github.com/LuccasGavarron/co-panel.git"
$dir = Join-Path $HOME "co-panel"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Instale o Git primeiro (git-scm.com)." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "Instale o Node.js primeiro (nodejs.org)." }

if (Test-Path (Join-Path $dir ".git")) {
  Write-Host "Atualizando co-panel em $dir..."
  git -C $dir pull --ff-only
} else {
  Write-Host "Baixando co-panel em $dir..."
  git clone $repo $dir
}

Set-Location $dir
Write-Host "Instalando dependencias..."
npm install --no-audit --no-fund
Write-Host "Buildando..."
npm run build

$desktop = [Environment]::GetFolderPath("Desktop")
$bat = Join-Path $desktop "co-panel.bat"
$target = Join-Path $dir "scripts\Abrir co-panel.bat"
Set-Content -Path $bat -Value "@echo off`r`ncall `"$target`"" -Encoding ASCII

Write-Host ""
Write-Host "Pronto! Dois cliques em co-panel.bat na Area de Trabalho pra abrir o co-panel."
