@echo off
REM Build and run React Native app with proper Java environment

echo ====================================
echo Setting up environment...
echo ====================================

REM Set JAVA_HOME
set JAVA_HOME=C:\Program Files\Java\jdk-17
echo JAVA_HOME set to: %JAVA_HOME%

set ANDROID_SDK_ROOT=C:\Android
if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
	set ANDROID_HOME=%ANDROID_SDK_ROOT%
	echo ANDROID_HOME set to: %ANDROID_HOME%
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
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo ANDROID_SDK_ROOT set to: %ANDROID_SDK_ROOT%

echo.
echo ====================================
echo Verifying setup...
echo ====================================

java -version
echo.

echo ====================================
echo Building React Native app...
echo ====================================
echo.

cd /d e:\Projects\my-react-native-app

REM Clear Metro cache and rebuild
call npm run android -- --no-jetifier

echo.
echo ====================================
echo Build complete!
echo ====================================
echo.
pause
