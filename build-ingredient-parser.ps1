# build-ingredient-parser.ps1
# Builds only the ingredient-parser image with BuildKit caching enabled.
#
# Usage:
#   .\build-ingredient-parser.ps1            # normal build (uses layer + pip cache)
#   .\build-ingredient-parser.ps1 -NoCache   # forces a fully clean rebuild
#   .\build-ingredient-parser.ps1 -Pull      # also pulls the latest base images

param(
    [switch]$NoCache,
    [switch]$Pull
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Prerequisites ──────────────────────────────────────────────────────────────
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker not found. Make sure Docker Desktop is running."
}

# ── Enable BuildKit ────────────────────────────────────────────────────────────
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

# ── Move to repo root (script can be called from any directory) ────────────────
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

# ── Build ──────────────────────────────────────────────────────────────────────
$buildArgs = @("compose", "build", "ingredient-parser")
if ($NoCache) { $buildArgs += "--no-cache" }
if ($Pull)    { $buildArgs += "--pull" }

Write-Host ""
Write-Host "==> Building ingredient-parser" -ForegroundColor Cyan
if ($NoCache) { Write-Host "    (--no-cache: skipping all cached layers)" -ForegroundColor Yellow }
if ($Pull)    { Write-Host "    (--pull: refreshing base images)" -ForegroundColor Yellow }
Write-Host ""

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

docker @buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Build FAILED (exit code $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}

$stopwatch.Stop()
$elapsed = $stopwatch.Elapsed
Write-Host ""
Write-Host "==> Build succeeded in $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor Green
Write-Host ""
Write-Host "Note: On first startup the container pulls mistral:latest (~4 GB)." -ForegroundColor DarkGray
Write-Host "      Subsequent starts reuse the 'ollama-models' Docker volume." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor DarkGray
Write-Host "  Start just parser:  docker compose up ingredient-parser" -ForegroundColor DarkGray
Write-Host "  Start full stack:   docker compose up" -ForegroundColor DarkGray
