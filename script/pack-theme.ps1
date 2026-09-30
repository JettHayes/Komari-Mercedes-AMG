# Pack Komari theme zip with forward-slash entry names (Linux-friendly).
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..")
Set-Location $root

$staging = Join-Path $root "theme-package"
$zipPath = Join-Path $root "Komari-Mercedes-AMG-theme.zip"

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null
Copy-Item (Join-Path $root "preview.png") $staging
Copy-Item (Join-Path $root "komari-theme.json") $staging
Copy-Item (Join-Path $root "dist") (Join-Path $staging "dist") -Recurse

# Official themes often keep preview under dist/assets; also busts admin cache on path change.
$previewDestDir = Join-Path $staging "dist\assets"
if (-not (Test-Path $previewDestDir)) { New-Item -ItemType Directory -Path $previewDestDir | Out-Null }
Copy-Item (Join-Path $root "preview.png") (Join-Path $previewDestDir "theme-preview.png") -Force
# Keep root preview.png for older Komari installers that expect it.
Copy-Item (Join-Path $root "preview.png") (Join-Path $staging "preview.png") -Force

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$fs = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)

function Add-Tree([string]$dir, [string]$prefix) {
  Get-ChildItem -LiteralPath $dir | ForEach-Object {
    $entryName = if ($prefix) { "$prefix/$($_.Name)" } else { $_.Name }
    $entryName = $entryName.Replace("\", "/")
    if ($_.PSIsContainer) {
      Add-Tree $_.FullName $entryName
    } else {
      $entry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
      $es = $entry.Open()
      $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
      $es.Write($bytes, 0, $bytes.Length)
      $es.Dispose()
    }
  }
}

Add-Tree $staging ""
$zip.Dispose()
$fs.Dispose()
Remove-Item $staging -Recurse -Force

Write-Host "Created $zipPath"
Get-Item $zipPath | Format-Table Name, Length
