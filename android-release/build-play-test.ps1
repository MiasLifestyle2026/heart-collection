# Google Play internal test: signed AAB, ALL 220 CARDS UNLOCKED.
# Run on your Windows PC from the repository root:
# powershell -ExecutionPolicy Bypass -File ".\android-release\build-play-test.ps1"
# This never edits the repository's production card-lock logic.
param(
    [int]$VersionCode = 0,
    [string]$KeystorePath = "",
    [string]$KeyAlias = "heart-upload"
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$jdk21 = Join-Path $env:USERPROFILE '.jdks\jbr-21.0.11'
if (Test-Path (Join-Path $jdk21 'bin\java.exe')) {
    $env:JAVA_HOME = $jdk21
    $env:PATH = (Join-Path $jdk21 'bin') + ';' + $env:PATH
}
if (!$env:JAVA_HOME -or !(Test-Path (Join-Path $env:JAVA_HOME 'bin\keytool.exe'))) {
    throw 'JDK 21 not found. Install/configure JDK 21 before building.'
}
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
$jarsigner = Join-Path $env:JAVA_HOME 'bin\jarsigner.exe'
if (!(Test-Path $jarsigner)) { throw 'jarsigner.exe not found in JAVA_HOME.' }

if ($VersionCode -lt 1) {
    $answer = Read-Host 'VersionCode for Google Play (must be HIGHER than your last uploaded versionCode)'
    $parsed = 0
    if (![int]::TryParse($answer,[ref]$parsed) -or $parsed -lt 1) {
        throw 'VersionCode must be a positive integer.'
    }
    $VersionCode = $parsed
}
if (!$KeystorePath) {
    $KeystorePath = Join-Path $env:USERPROFILE '.heart-collection\signing\heart-upload.jks'
}
$KeystorePath = [System.IO.Path]::GetFullPath($KeystorePath)
$root = (Resolve-Path '..').Path
$config = Get-Content 'capacitor.config.json' -Raw -Encoding UTF8 | ConvertFrom-Json
if ($config.appId -ne 'com.miaslifestyle.heartcollection') {
    throw "Unexpected package name: $($config.appId). STOP: check your existing Play Console app."
}

Write-Host ''
Write-Host 'THE HEART COLLECTION - INTERNAL GOOGLE PLAY TEST' -ForegroundColor Magenta
Write-Host 'Both decks, all 220 cards, all 12 languages will be unlocked in THIS BUILD ONLY.' -ForegroundColor Yellow
Write-Host 'Do NOT promote this AAB to production. It contains all premium cards in a test-enabled app.' -ForegroundColor Yellow
Write-Host "Package: $($config.appId) | VersionCode: $VersionCode"

if (!(Test-Path 'node_modules')) {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
}
if (!(Test-Path 'android\gradlew.bat')) {
    & npm.cmd run prepare:web
    if ($LASTEXITCODE -ne 0) { throw 'prepare:web failed' }
    & npx.cmd cap add android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor Android setup failed' }
}
& npm.cmd run android:sync
if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed' }

# The user-owned source code is UNMODIFIED. Only the Android build output is patched.
$public = Join-Path $PSScriptRoot 'android\app\src\main\assets\public'
$jsPath = Join-Path $public 'prototype.js'
$htmlPath = Join-Path $public 'index.html'
if (!(Test-Path $jsPath) -or !(Test-Path $htmlPath)) {
    throw 'Missing generated Android web assets.'
}
$js = Get-Content $jsPath -Raw -Encoding UTF8
$locked = 'function isFree(c){return !!c&&freeIds.has(Number(c.id));}'
$unlocked = 'function isFree(c){return !!c;}' # ALL 110 + 110 cards, including favorites and couple rooms
if (!$js.Contains($locked)) {
    throw 'Card-lock function changed unexpectedly. Refusing to create an unverified test build.'
}
$js = $js.Replace($locked,$unlocked)
[System.IO.File]::WriteAllText($jsPath,$js,(New-Object System.Text.UTF8Encoding($false)))

$html = Get-Content $htmlPath -Raw -Encoding UTF8
if (!$html.Contains('</header>') -or !$html.Contains('translations-nl.js')) {
    throw 'Outdated app HTML: stop before creating a Play upload.'
}
$banner = '<div id="internal-test-banner" style="margin:10px 18px;padding:9px 12px;border:1px solid #f6cd80;border-radius:12px;background:#6c153c;color:#ffe8bc;text-align:center;font:700 11px Arial,sans-serif;letter-spacing:.6px">🔓 INTERNER PLAY-TEST · ALLE 220 KARTEN FREIGESCHALTET</div>'
$html = $html.Replace('</header>','</header>' + $banner)
# Avoid telling testers that premium content is locked.
$html = [regex]::Replace($html,'<p class="preview-disclaimer" data-i18n="previewNote">.*?</p>','<p class="preview-disclaimer">Testversion: Alle 220 Karten in beiden Decks sind freigeschaltet.</p>')
$html = [regex]::Replace($html,'<p class="preview-disclaimer" data-i18n="roomInfo">.*?</p>','<p class="preview-disclaimer">Interner Play-Test: Beide Decks sind vollständig freigeschaltet und werden synchronisiert.</p>')
[System.IO.File]::WriteAllText($htmlPath,$html,(New-Object System.Text.UTF8Encoding($false)))
if ($js.Contains($locked) -or !$js.Contains($unlocked) -or !$html.Contains('internal-test-banner')) {
    throw 'Internal test unlock verification failed.'
}
Write-Host 'Verified: test-only full unlock in generated Android assets.' -ForegroundColor Green

# Capacitor 8 requires compileSdkVersion and targetSdkVersion 36.
$vars = Join-Path $PSScriptRoot 'android\variables.gradle'
if (!(Test-Path $vars)) { throw 'Missing android/variables.gradle' }
$values = Get-Content $vars -Raw -Encoding UTF8
foreach ($name in @('compileSdkVersion','targetSdkVersion')) {
    $m = [regex]::Match($values, '(?m)^\s*' + $name + '\s*=\s*(\d+)')
    if (!$m.Success -or [int]$m.Groups[1].Value -lt 36) {
        throw "$name must be 36 (Capacitor 8 / Google Play 2026). Update your Android project."
    }
}

# Choose a unique, increasing Google Play versionCode.
$gradle = Join-Path $PSScriptRoot 'android\app\build.gradle'
if (!(Test-Path $gradle)) { throw 'Expected Android Gradle Groovy build file not found.' }
$content = Get-Content $gradle -Raw -Encoding UTF8
$pattern = '(?m)^(\s*versionCode\s*(?:=\s*)?)\d+'
if (![regex]::IsMatch($content,$pattern)) { throw 'Cannot find versionCode in Android app/build.gradle' }
$content = ([regex]::new($pattern)).Replace($content,'1' + $VersionCode,1)
[System.IO.File]::WriteAllText($gradle,$content,(New-Object System.Text.UTF8Encoding($false)))

# Gradle produces an unsigned release AAB by default; sign it using the user's
# private upload key, which is stored OUTSIDE the GitHub repository.
Push-Location 'android'
try {
    & .\gradlew.bat --no-daemon bundleRelease
    if ($LASTEXITCODE -ne 0) { throw 'Gradle bundleRelease failed' }
} finally { Pop-Location }
$unsigned = Join-Path $PSScriptRoot 'android\app\build\outputs\bundle\release\app-release.aab'
if (!(Test-Path $unsigned)) { throw "No AAB created at $unsigned" }

$folder = Split-Path $KeystorePath -Parent
New-Item -ItemType Directory -Force -Path $folder | Out-Null
if (!(Test-Path $KeystorePath)) {
    Write-Warning 'No existing upload key found. If this app has already been uploaded to Google Play, reuse its original upload key instead!'
    $approval = Read-Host 'Create a new permanent upload key for this app? Type CREATE to confirm'
    if ($approval -cne 'CREATE') { throw 'Cancelled. Existing Play upload keys must be reused.' }
}
$secret = Read-Host 'Your upload key password (store it somewhere SAFE; do not share it in chat)' -AsSecureString
$password = [System.Net.NetworkCredential]::new('', $secret).Password
if ($password.Length -lt 6) { throw 'Password must have at least 6 characters.' }
$env:HEART_SIGNING_PW = $password
$password = $null
try {
    if (!(Test-Path $KeystorePath)) {
        & $keytool -genkeypair -v -keystore $KeystorePath -alias $KeyAlias -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=The Heart Collection, OU=Android Upload, O=Mia Lifestyle, C=DE' '-storepass:env' HEART_SIGNING_PW '-keypass:env' HEART_SIGNING_PW
        if ($LASTEXITCODE -ne 0) { throw 'Could not create upload keystore.' }
        Write-Host "IMPORTANT: Back up this keystore securely: $KeystorePath" -ForegroundColor Yellow
    }
    $target = Join-Path $PSScriptRoot "The-Heart-Collection-INTERNAL-TEST-v$VersionCode.aab"
    if (Test-Path $target) { throw "File already exists: $target. Use a new versionCode." }
    & $jarsigner -keystore $KeystorePath '-storepass:env' HEART_SIGNING_PW '-keypass:env' HEART_SIGNING_PW -signedjar $target $unsigned $KeyAlias
    if ($LASTEXITCODE -ne 0) { throw 'AAB signing failed; check password, alias and keystore.' }
    $verification = (& $jarsigner '-J-Duser.language=en' -verify $target 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0 -or $verification -notmatch 'jar verified') { throw "Signed AAB verification failed: $verification" }
} finally {
    Remove-Item Env:HEART_SIGNING_PW -ErrorAction SilentlyContinue
    $password = $null
    $secret = $null
}
Write-Host ''
Write-Host "SIGNED INTERNAL-TEST AAB READY: $target" -ForegroundColor Green
Write-Host 'Upload ONLY to Play Console > Testing > Internal testing. Never use this test AAB for production.' -ForegroundColor Yellow
