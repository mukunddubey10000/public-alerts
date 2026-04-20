@echo off
REM Simple script to run the React Native app on physical Android phone
REM No need to use adb manually, just run this!

echo.
echo ====================================================
echo   Starting CivicAlerts on your Android Phone
echo ====================================================
echo.
echo Step 1: Making sure your phone is connected...
echo.

set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_SDK_ROOT=C:\Android
set "PATH=%JAVA_HOME%\bin;%PATH%"

if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
	set ANDROID_HOME=%ANDROID_SDK_ROOT%
	set "PATH=%ANDROID_SDK_ROOT%\platform-tools;%PATH%"
) else if exist "%ANDROID_SDK_ROOT%\cmdline-tools\adb.exe" (
	echo WARNING: Android SDK platform-tools missing; using adb from cmdline-tools.
	set "ANDROID_HOME="
	set "PATH=%ANDROID_SDK_ROOT%\cmdline-tools;%PATH%"
) else (
	echo ERROR: Could not find adb under %ANDROID_SDK_ROOT%. Install platform-tools or correct ANDROID_SDK_ROOT.
	pause
	exit /b 1
)

adb devices

echo.
echo If you don't see your phone above, check:
echo   1. USB cable is connected
echo   2. USB Debugging is enabled on phone
echo   3. Try disconnecting and reconnecting USB
echo.
pause

echo.
echo Step 2: Building and installing app...
echo Please wait, this takes 2-3 minutes...
echo.

cd /d E:\Projects\my-react-native-app
call npm run android

echo.
echo ====================================================
echo   App should now be launching on your phone!
echo ====================================================
echo.
pause
