@echo off
REM CivicAlerts - Build and Deploy to Phone
REM This script handles everything: Java setup, gradle, build, and deploy

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════╗
echo ║   CivicAlerts - Build and Deploy       ║
echo ╚════════════════════════════════════════╝
echo.

REM Set Java and Android paths
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_SDK_ROOT=C:\Android
set "PATH=%JAVA_HOME%\bin;%PATH%"

if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
  set ANDROID_HOME=%ANDROID_SDK_ROOT%
  set "PATH=%ANDROID_SDK_ROOT%\platform-tools;%PATH%"
) else (
  set "ANDROID_HOME="
  if exist "%ANDROID_SDK_ROOT%\cmdline-tools\adb.exe" (
    echo WARNING: Android SDK platform-tools missing; using adb from cmdline-tools.
    set "PATH=%ANDROID_SDK_ROOT%\cmdline-tools;%PATH%"
  ) else (
    echo ERROR: Unable to locate adb under %ANDROID_SDK_ROOT%.
    echo Install Android SDK platform-tools or set ANDROID_SDK_ROOT to the correct SDK root.
    pause
    exit /b 1
  )
)
echo ANDROID_SDK_ROOT set to: %ANDROID_SDK_ROOT%

echo Verifying environment...
echo JAVA_HOME: %JAVA_HOME%
echo ANDROID_HOME: %ANDROID_HOME%
echo.

REM Verify Java
echo Checking Java...
java -version
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Java not found!
  pause
  exit /b 1
)
echo.

REM Verify phone connection
echo Checking phone connection...
adb devices
echo.

REM Navigate to project
cd /d e:\Projects\my-react-native-app

REM Clear Metro cache and rebuild
echo.
echo ════════════════════════════════════════
echo Step 1: Clearing cache...
echo ════════════════════════════════════════
echo.

REM Remove gradle build cache
rmdir /s /q android\app\build 2>nul
rmdir /s /q android\.gradle 2>nul

echo Cache cleared.
echo.

echo ════════════════════════════════════════
echo Step 2: Building React Native app...
echo ════════════════════════════════════════
echo.

REM Install dependencies if needed
call npm install --legacy-peer-deps

REM Build with npm
call npm run android -- --no-jetifier

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ════════════════════════════════════════
  echo ✅ Build successful!
  echo App should be installing on your phone...
  echo ════════════════════════════════════════
  echo.
) else (
  echo.
  echo ════════════════════════════════════════
  echo ❌ Build failed. Checking gradle manually...
  echo ════════════════════════════════════════
  echo.
  
  REM Try gradle directly
  cd android
  echo Attempting direct gradle call...
  call gradlew.bat clean build -x test
  
  if %ERRORLEVEL% EQU 0 (
    echo Gradle build successful, trying npm again...
    cd ..
    call npm run android
  )
)

echo.
pause
