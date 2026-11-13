# Build Android local, côté Windows : plus de RAM que WSL, pas de quota EAS. Voir DEVELOPMENT.md §7.
# - Par défaut : dev client « PostKeep Dev » (com.thejohninc.postkeep.dev), installé sur le téléphone.
# - -Release : APK autonome de l'app (com.thejohninc.postkeep, JS embarqué, R8), signé avec la clé
#   de debug du gabarit Expo, pas celle d'EAS : il ne s'installe pas par-dessus un APK EAS
#   (désinstaller d'abord), mais bien par-dessus un APK -Release précédent. Pas installé
#   automatiquement.
#
# Usage (PowerShell Windows) :
#   powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Debian-dev\home\drakotomahefa\dev\zperso\postkeep\scripts\build-dev-android.ps1 [-Branch master] [-Release] [-Clean]
#
# Le clone (C:\dev\pk, ou C:\dev\pkr en -Release : chaque mode garde son projet natif et son cache)
# ne sert qu'à builder : il est remis à l'état de la branche du dépôt WSL à chaque lancement
# (modifications locales du clone perdues). npm ci et expo prebuild ne sont relancés que si les
# dépendances ou la config native ont changé ; Gradle garde son cache, donc les builds suivants
# sont incrémentaux. Un changement JS seul ne demande aucun dev build (Metro).
param(
  [string]$Branch = 'master',
  [string]$Clone = '',
  [string]$Source = '\\wsl.localhost\Debian-dev\home\drakotomahefa\dev\zperso\postkeep',
  [switch]$Release,
  [switch]$Clean
)
$ErrorActionPreference = 'Stop'
$started = Get-Date
if (-not $Clone) { $Clone = if ($Release) { 'C:\dev\pkr' } else { 'C:\dev\pk' } }
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
# JDK 21 : celui d'Android Studio (25) est trop récent pour Kotlin 2.2 (RN 0.88).
$env:JAVA_HOME = (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' | Select-Object -First 1).FullName
$env:ANDROID_HOME = $sdk
$env:APP_VARIANT = if ($Release) { '' } else { 'development' }
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
Step "Code ($Branch depuis le dépôt WSL) dans $Clone"
if (-not (Test-Path "$Clone\.git")) {
  New-Item -ItemType Directory -Force (Split-Path $Clone) | Out-Null
  Run git ($git + @('clone', $Source, $Clone))
}
Push-Location $Clone
try {
  Run git ($git + @('fetch', 'origin'))
  Run git ($git + @('checkout', '-B', $Branch, "origin/$Branch"))
  Run git ($git + @('reset', '--hard', "origin/$Branch"))

  if ($Release) {
    # Le JS est embarqué dans l'APK : les EXPO_PUBLIC_* (Supabase) y sont figés au bundle. Seules
    # ces lignes sont copiées, pas le reste de .env.local (mot de passe du compte de dev).
    Get-Content "$Source\.env.local" | Where-Object { $_ -match '^EXPO_PUBLIC_' } | Set-Content .env.local
  }

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

  $task = if ($Release) { 'app:assembleRelease' } else { 'app:assembleDebug' }
  Step "Gradle : $task (arm64-v8a)"
  Push-Location android
  try {
    Run .\gradlew.bat @($task, '--build-cache', '--parallel', '--max-workers=4')
  } finally { Pop-Location }

  if ($Release) {
    $version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
    $apk = "$Clone\postkeep-v$version.apk"
    Copy-Item 'android\app\build\outputs\apk\release\app-release.apk' $apk -Force
    Step "APK release : $apk (non installé)"
  } else {
    $apk = 'android\app\build\outputs\apk\debug\app-debug.apk'
    Step "Installation sur le téléphone ($apk)"
    # Même adb que le reste du poste s'il existe : deux versions d'adb se coupent leur serveur.
    $adb = @("$env:LOCALAPPDATA\platform-tools\adb.exe", "$sdk\platform-tools\adb.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
    Run $adb @('install', '-r', $apk)
  }
} finally { Pop-Location }

Step ("Terminé en {0:mm\:ss}." -f ((Get-Date) - $started))
