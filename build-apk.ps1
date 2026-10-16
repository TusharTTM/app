# Builds a debug APK for NutriCommunity (Capacitor + Android).
#
# Usage (from anywhere):
#   powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
#
# Requires the Android toolchain installed at the paths below
# (Temurin JDK 17 + Android SDK, installed under C:\Users\Tushar\android-tools).
# Nothing here needs an account, a keystore, or any payment: the debug APK is
# signed automatically with Android's built-in debug key.

$ErrorActionPreference = "Stop"

$JAVA_HOME_PATH = "C:\Users\Tushar\android-tools\jdk-17.0.20.1+1"
$ANDROID_HOME_PATH = "C:\Users\Tushar\android-tools\sdk"

$env:JAVA_HOME = $JAVA_HOME_PATH
$env:ANDROID_HOME = $ANDROID_HOME_PATH
$env:ANDROID_SDK_ROOT = $ANDROID_HOME_PATH
$env:Path = "$JAVA_HOME_PATH\bin;$ANDROID_HOME_PATH\platform-tools;$env:Path"

$client = $PSScriptRoot

Write-Host "==> Building web app (Vite)..." -ForegroundColor Cyan
Push-Location $client
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "vite build failed" }

Write-Host "==> Syncing web assets into the Android project..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "cap sync failed" }
Pop-Location

Write-Host "==> Compiling debug APK (Gradle)..." -ForegroundColor Cyan
Push-Location "$client\android"
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "gradle assembleDebug failed" }
Pop-Location

$src = "$client\android\app\build\outputs\apk\debug\app-debug.apk"
$out = "$client\..\NutriCommunity-debug.apk"
Copy-Item $src $out -Force
Write-Host "==> Done. APK written to: $((Resolve-Path $out).Path)" -ForegroundColor Green
