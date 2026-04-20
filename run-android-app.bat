@echo off
REM Build and run Android app with Java properly configured

echo.
echo ========================================
echo   CivicAlerts - Build and Deploy
echo ========================================
echo.

REM Set environment variables for this session
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

echo Java Home: %JAVA_HOME%
echo Android Home: %ANDROID_HOME%
echo.

echo Verifying Java installation...
java -version
echo.

echo Make sure:
echo   1. Your phone is connected via USB
echo   2. USB Debugging is enabled
echo   3. npm start is running in another terminal
echo.

echo Building app...
cd /d e:\Projects\my-react-native-app
call npm run android

echo.
echo ========================================
echo Build complete! Check your phone.
echo ========================================
echo.
pause