@echo off
REM Verify Android environment is properly configured

echo.
echo ====================================
echo  Android Environment Verification
echo ====================================
echo.

REM Check ANDROID_HOME
echo Checking ANDROID_SDK_ROOT / ANDROID_HOME...
echo ANDROID_SDK_ROOT: %ANDROID_SDK_ROOT%
echo ANDROID_HOME: %ANDROID_HOME%
if "%ANDROID_SDK_ROOT%"=="" (
  echo ❌ ANDROID_SDK_ROOT not set!
) else (
  if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
    echo ✅ ANDROID_SDK_ROOT contains platform-tools
  ) else if exist "%ANDROID_SDK_ROOT%\cmdline-tools\adb.exe" (
    echo ⚠️ ANDROID_SDK_ROOT does not contain platform-tools, but adb exists under cmdline-tools
    echo   Install platform-tools for full Android SDK compatibility.
  ) else (
    echo ❌ adb not found under %ANDROID_SDK_ROOT%
  )
  if exist "%ANDROID_SDK_ROOT%\platforms\android-31" (
    echo ✅ Android SDK platform android-31 is installed
  ) else (
    echo ❌ Android platform android-31 not found under %ANDROID_SDK_ROOT%\platforms
    echo   Install with sdkmanager "platforms;android-31"
  )
  if exist "%ANDROID_SDK_ROOT%\build-tools\30.0.3" (
    echo ✅ Android build-tools 30.0.3 is installed
  ) else (
    echo ❌ Android build-tools 30.0.3 not found under %ANDROID_SDK_ROOT%\build-tools
    echo   Install with sdkmanager "build-tools;30.0.3"
  )
)

echo.

REM Check if adb is accessible
echo Checking adb...
where adb >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  echo ✅ adb found in PATH
  adb --version
) else (
  echo ❌ adb not found in PATH
  echo   Try: %ANDROID_SDK_ROOT%\cmdline-tools\adb.exe --version or install platform-tools
)

echo.

REM Check if java is accessible
echo Checking Java...
where java >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  echo ✅ Java found in PATH
  java -version
) else (
  echo ❌ Java not found in PATH
  echo   Make sure JDK is installed
)

echo.
echo ====================================
echo If you see ✅ marks above, you're ready to build!
echo ====================================
echo.
