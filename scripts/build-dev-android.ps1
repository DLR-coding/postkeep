# Build local du dev client Android (variante « PostKeep Dev », com.thejohninc.postkeep.dev),
# côté Windows : plus de RAM que WSL, pas de quota EAS. Voir DEVELOPMENT.md §7.
#
# Usage (PowerShell Windows) :
#   powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Debian-dev\home\drakotomahefa\dev\zperso\postkeep\scripts\build-dev-android.ps1 [-Branch master] [-Clean]
#
# Le clone C:\dev\pk ne sert qu'à builder : il est remis à l'état de la branche du dépôt WSL à
# chaque lancement (modifications locales du clone perdues). npm ci et expo prebuild ne sont
# relancés que si les dépendances ou la config native ont changé ; Gradle garde son cache, donc
# les builds suivants sont incrémentaux. Un changement JS seul ne demande aucun build (Metro).
param(
  [string]$Branch = 'master',
  [string]$Clone = 'C:\dev\pk',
  [string]$Source = '\\wsl.localhost\Debian-dev\home\drakotomahefa\dev\zperso\postkeep',
  [switch]$Clean
)
$ErrorActionPreference = 'Stop'
$started = Get-Date
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
# JDK 21 : celui d'Android Studio (25) est trop récent pour Kotlin 2.2 (RN 0.88).
$env:JAVA_HOME = (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' | Select-Object -First 1).FullName
$env:ANDROID_HOME = $sdk
$env:APP_VARIANT = 'development'
# Une seule architecture (le téléphone est en arm64) : 4 fois moins de C++ à compiler et lier.
$env:ORG_GRADLE_PROJECT_reactNativeArchitectures = 'arm64-v8a'
$env:GRADLE_OPTS = '-Dorg.gradle.jvmargs="-Xmx6g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8"'

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Run($exe, [string[]]$arguments) {
  & $exe @arguments
  if ($LASTEXITCODE -ne 0) { throw "$exe $($arguments -join ' ') a échoué ($LASTEXITCODE)" }
}

# Le dépôt source est sous \\wsl.localhost : git refuse sinon un dépôt « d'un autre propriétaire ».
$git = @('-c', 'safe.directory=*', '-c', 'core.autocrlf=false')
Step "Code ($Branch depuis le dépôt WSL)"
if (-not (Test-Path "$Clone\.git")) {
  New-Item -ItemType Directory -Force (Split-Path $Clone) | Out-Null
  Run git ($git + @('clone', $Source, $Clone))
}
Push-Location $Clone
try {
  Run git ($git + @('fetch', 'origin'))
  Run git ($git + @('checkout', '-B', $Branch, "origin/$Branch"))
  Run git ($git + @('reset', '--hard', "origin/$Branch"))

  # Empreinte de ce qui change le natif : dépendances et config Expo.
  $stamp = (Get-FileHash -Algorithm SHA256 -InputStream ([IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes(
    ((Get-Content package-lock.json, app.json, app.config.js -Raw) -join '')
  )))).Hash
  $stampFile = '.native-stamp'
  $changed = $Clean -or -not (Test-Path android) -or -not (Test-Path $stampFile) -or ((Get-Content $stampFile -Raw).Trim() -ne $stamp)

  if ($changed) {
    Step 'Dépendances (npm ci) et projet natif (expo prebuild --clean)'
    Run npm @('ci', '--no-audit', '--no-fund')
    Run npx @('expo', 'prebuild', '--platform', 'android', '--clean', '--no-install')
    Set-Content $stampFile $stamp
  } else {
    Step 'Dépendances et config native inchangées : npm ci et prebuild sautés'
  }

  Step 'Gradle : assembleDebug (arm64-v8a)'
  Push-Location android
  try {
    Run .\gradlew.bat @('app:assembleDebug', '--build-cache', '--parallel', '--max-workers=4')
  } finally { Pop-Location }

  $apk = 'android\app\build\outputs\apk\debug\app-debug.apk'
  Step "Installation sur le téléphone ($apk)"
  # Même adb que le reste du poste s'il existe : deux versions d'adb se coupent leur serveur.
  $adb = @("$env:LOCALAPPDATA\platform-tools\adb.exe", "$sdk\platform-tools\adb.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  Run $adb @('install', '-r', $apk)
} finally { Pop-Location }

Step ("Terminé en {0:mm\:ss}. Metro dans WSL : npx expo start --dev-client, puis adb reverse tcp:8081 tcp:8081" -f ((Get-Date) - $started))
