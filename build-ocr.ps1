# build-ocr.ps1
# Builds only the ocr-service image with BuildKit caching enabled.
#
# Usage:
#   .\build-ocr.ps1            # normal build (uses layer + pip cache)
#   .\build-ocr.ps1 -NoCache   # forces a fully clean rebuild (re-downloads everything)
#   .\build-ocr.ps1 -Pull      # also pulls the latest python:3.11-slim base image

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
# BuildKit is required for the --mount=type=cache in the Dockerfile to work.
# Without it, the pip cache mount is silently ignored and torch/EasyOCR are
# re-downloaded every single build.
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

# ── Move to repo root (script can be called from any directory) ────────────────
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

# ── Build ──────────────────────────────────────────────────────────────────────
$buildArgs = @("compose", "build", "ocr-service")
if ($NoCache) { $buildArgs += "--no-cache" }
if ($Pull)    { $buildArgs += "--pull" }

Write-Host ""
Write-Host "==> Building ocr-service" -ForegroundColor Cyan
if ($NoCache) { Write-Host "    (--no-cache: skipping all cached layers)" -ForegroundColor Yellow }
if ($Pull)    { Write-Host "    (--pull: refreshing base image)" -ForegroundColor Yellow }
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
Write-Host "Next steps:" -ForegroundColor DarkGray
Write-Host "  Start just OCR:     docker compose up ocr-service" -ForegroundColor DarkGray
Write-Host "  Start full stack:   docker compose up" -ForegroundColor DarkGray

