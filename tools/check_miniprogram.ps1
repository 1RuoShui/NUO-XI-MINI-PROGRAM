param([string]$CompilerDirectory = '')
$ErrorActionPreference = 'Stop'
if (!$CompilerDirectory) {
  $registryPaths = @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*')
  foreach ($entry in (Get-ItemProperty $registryPaths -ErrorAction SilentlyContinue)) {
    if (!$entry.DisplayIcon) { continue }
    $exePath = ($entry.DisplayIcon -replace ',\d+$', '').Trim('"')
    if (!(Test-Path -LiteralPath $exePath -ErrorAction SilentlyContinue)) { continue }
    $candidate = Join-Path (Split-Path -Parent $exePath) 'resources/app.asar.unpacked/node_modules/wcc-exec'
    if (Test-Path -LiteralPath (Join-Path $candidate 'wcc.exe')) { $CompilerDirectory = $candidate; break }
  }
}
if (!$CompilerDirectory) { throw 'WeChat DevTools not found; pass -CompilerDirectory.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
$miniRoot = Join-Path $projectRoot 'miniprogram'
$qaRoot = Join-Path $PSScriptRoot 'qa'
$wcc = Join-Path $CompilerDirectory 'wcc.exe'
$wcsc = Join-Path $CompilerDirectory 'wcsc.exe'
if (!(Test-Path -LiteralPath $wcc) -or !(Test-Path -LiteralPath $wcsc)) {
  throw 'Pass -CompilerDirectory pointing to the installed WeChat DevTools wcc-exec directory.'
}
New-Item -ItemType Directory -Path $qaRoot -Force | Out-Null
Push-Location $miniRoot
try {
  & $wcc -o (Join-Path $qaRoot 'compiled-wxml.js') 'pages/index/index.wxml'
  if ($LASTEXITCODE -ne 0) { throw 'WXML compilation failed' }
  & $wcsc -o (Join-Path $qaRoot 'compiled-app-wxss.js') 'app.wxss'
  if ($LASTEXITCODE -ne 0) { throw 'App WXSS compilation failed' }
  & $wcsc -o (Join-Path $qaRoot 'compiled-wxss.js') 'pages/index/index.wxss'
  if ($LASTEXITCODE -ne 0) { throw 'Page WXSS compilation failed' }
} finally { Pop-Location }
foreach ($relativePath in @('miniprogram/app.js', 'miniprogram/config.js', 'miniprogram/data/catalog.js', 'miniprogram/pages/index/index.js', 'miniprogram/utils/nuoyi-cloud.js', 'cloudfunctions/nuoyiService/index.js', 'cloudfunctions/quickstartFunctions/index.js', 'cloudfunctions/quickstartFunctions/user-profile.js')) {
  & node --check (Join-Path $projectRoot $relativePath)
  if ($LASTEXITCODE -ne 0) { throw "JS syntax failed: $relativePath" }
}
& node (Join-Path $PSScriptRoot 'test_miniprogram.js')
if ($LASTEXITCODE -ne 0) { throw 'Behavior checks failed' }
& node (Join-Path $PSScriptRoot 'test_cloudfunctions.js')
if ($LASTEXITCODE -ne 0) { throw 'Cloud function behavior checks failed' }
$bytes = (Get-ChildItem -LiteralPath $miniRoot -Recurse -File | Measure-Object -Property Length -Sum).Sum
Write-Output ('Mini-program directory: {0:N2} MiB' -f ($bytes / 1MB))
if ($bytes -ge 2MB) { throw 'Mini-program directory exceeds the 2 MiB project budget' }
