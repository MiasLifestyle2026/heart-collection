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
Push-Location 'android'
try {
  & .\gradlew.bat --no-daemon assembleDebug
  if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed; see error above' }
} finally { Pop-Location }
$apk = Join-Path $PSScriptRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
Write-Host ''
Write-Host "BUILD OK: $apk" -ForegroundColor Green
Write-Host 'This is a debug APK for device testing, not a signed Play Store AAB.'
