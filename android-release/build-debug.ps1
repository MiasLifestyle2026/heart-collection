# One-command local Android debug build. Run from any directory:
# powershell -ExecutionPolicy Bypass -File .\android-release\build-debug.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:GRADLE_USER_HOME = Join-Path $env:USERPROFILE '.gradle'
New-Item -ItemType Directory -Force -Path $env:GRADLE_USER_HOME | Out-Null
$jdk21 = Join-Path $env:USERPROFILE '.jdks\jbr-21.0.11'
if (Test-Path (Join-Path $jdk21 'bin\java.exe')) {
  $env:JAVA_HOME = $jdk21
  $env:PATH = (Join-Path $jdk21 'bin') + ';' + $env:PATH
} elseif ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  Write-Host "Using existing JAVA_HOME: $env:JAVA_HOME"
} else {
  Write-Warning 'JDK 21 not found at expected path. Set JAVA_HOME to JDK 21 if Gradle reports a Java version error.'
}
if (!(Test-Path 'node_modules')) {
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
}
if (!(Test-Path 'android\gradlew.bat')) {
  & npx.cmd cap add android
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor Android initialization failed' }
}
& npm.cmd run android:sync
if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }
$web = Join-Path $PSScriptRoot 'www'
$index = Get-Content (Join-Path $web 'index.html') -Raw -Encoding UTF8
$luxuryJs = Get-Content (Join-Path $web 'prototype.js') -Raw -Encoding UTF8
$funJs = Get-Content (Join-Path $web 'love-laughs-cards.js') -Raw -Encoding UTF8
if ($index -notmatch 'love-laughs-cards\.js' -or
    $index -notmatch 'id="screen-home"' -or
    $index -notmatch 'id="screen-couple"' -or
    $index -notmatch 'id="createRoom"' -or
    $index -notmatch 'prototype\.js' -or
    $luxuryJs -notmatch 'HEART_FUN_CARDS' -or
    $luxuryJs -notmatch 'firebaseApi\.onSnapshot' -or
    $funJs -notmatch 'HEART_FUN_CARDS' -or
    !(Test-Path (Join-Path $web 'prototype.css'))) {
  throw 'The new luxury UI or its live couple mode is missing; refusing to build an outdated APK.'
}
Write-Host 'Verified: luxury home screen, both decks, 8-language interface and Firebase rooms.' -ForegroundColor Green
Push-Location 'android'
try {
  & .\gradlew.bat --no-daemon assembleDebug
  if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed; see error above' }
} finally { Pop-Location }
$apk = Join-Path $PSScriptRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
$assets = Join-Path $PSScriptRoot 'android\app\src\main\assets\public'
foreach ($needed in @('prototype.js','prototype.css','index.html','love-laughs-cards.js','firebase-config.js','interface.js')) {
  if (!(Test-Path (Join-Path $assets $needed))) {
    throw "Android package is missing $needed; refusing to publish an outdated APK."
  }
}
$target = Join-Path $PSScriptRoot 'The-Heart-Collection-NEW-DESIGN-debug.apk'
Copy-Item -LiteralPath $apk -Destination $target -Force
Write-Host ''
Write-Host 'BUILD OK: luxury Heart Collection Android UI' -ForegroundColor Green
Write-Host "INSTALL THIS FILE: $target" -ForegroundColor Green
Write-Host 'For testing only: Google Play requires a separate signed AAB.'
