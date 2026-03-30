$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot "dist"
$outputPath = Join-Path $projectRoot "aleshka-story-dist.zip"

if (-not (Test-Path $distPath)) {
  Write-Error "Папка dist не найдена. Сначала запусти npm.cmd run build"
}

if (Test-Path $outputPath) {
  Remove-Item -LiteralPath $outputPath
}

Compress-Archive -Path (Join-Path $distPath "*") -DestinationPath $outputPath
Write-Host "Архив создан:" $outputPath
