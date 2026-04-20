@echo off
REM Simplified build script - calls gradle directly with proper setup

echo.
echo ========================================
echo   CivicAlerts - Simplified Build
echo ========================================
echo.

REM Set environment
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

echo Checking Java...
java -version
echo.

echo Checking Android...
adb devices
echo.

echo Building React Native app...
cd /d e:\Projects\my-react-native-app

REM Call gradle directly from android folder
echo Running gradle...
cd android
call gradlew.bat app:installDebug -PreactNativeDevServerPort=8081

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ========================================
  echo   Build successful! Installing...
  echo ========================================
  echo.
  
  REM Launch app on phone
  cd /d e:\Projects\my-react-native-app
  npx react-native start --reset-cache &
  
) else (
  echo.
  echo Build failed with error code: %ERRORLEVEL%
  echo.
)

pause
