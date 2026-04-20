#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Colors ───────────────────────────────────────────────────────────────────
function Write-Info  ($msg) { Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok    ($msg) { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn  ($msg) { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Fail  ($msg) { Write-Host "[FAIL]  $msg" -ForegroundColor Red }

# ─── Detect package manager (winget preferred, fallback choco) ────────────────
function Get-PkgManager {
    if (Get-Command winget -ErrorAction SilentlyContinue) { return "winget" }
    if (Get-Command choco  -ErrorAction SilentlyContinue) { return "choco" }
    return $null
}

function Install-WithPkgManager ($name, $wingetId, $chocoId) {
    $mgr = Get-PkgManager
    if ($mgr -eq "winget") {
        Write-Info "Installing $name via winget..."
        winget install --id $wingetId --accept-source-agreements --accept-package-agreements -e
    } elseif ($mgr -eq "choco") {
        Write-Info "Installing $name via Chocolatey..."
        choco install $chocoId -y
    } else {
        Write-Fail "No package manager found. Install winget (comes with App Installer from Microsoft Store) or Chocolatey (https://chocolatey.org/install) first."
        exit 1
    }
}

# Refresh PATH within the current session
function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

Write-Host ""
Write-Info "Platform: Windows ($([System.Environment]::OSVersion.VersionString))"

# ─── 1. Node.js ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Info "Checking Node.js..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Ok "Node.js $nodeVer"
} else {
    Write-Warn "Node.js not found."
    Install-WithPkgManager "Node.js" "OpenJS.NodeJS.LTS" "nodejs-lts"
    Refresh-Path
}

# ─── 2. npm ───────────────────────────────────────────────────────────────────
Write-Info "Checking npm..."
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVer = npm -v
    Write-Ok "npm $npmVer"
} else {
    Write-Warn "npm not found (should come with Node.js). Refresh your terminal after Node install."
}

# ─── 3. JDK ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Info "Checking JDK..."
if (Get-Command javac -ErrorAction SilentlyContinue) {
    $javaVer = javac -version 2>&1
    Write-Ok "$javaVer"
} else {
    Write-Warn "JDK not found. Installing JDK 17..."
    Install-WithPkgManager "JDK 17" "Microsoft.OpenJDK.17" "openjdk17"
    Refresh-Path
}

# JAVA_HOME
if (-not $env:JAVA_HOME) {
    # Try to auto-detect
    $javaPath = Get-Command javac -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    if ($javaPath) {
        $detected = Split-Path (Split-Path $javaPath)
        Write-Warn "JAVA_HOME not set. Detected: $detected"
        Write-Warn "Set it permanently:  [Environment]::SetEnvironmentVariable('JAVA_HOME', '$detected', 'User')"
    } else {
        Write-Warn "JAVA_HOME not set and javac not on PATH."
    }
} else {
    Write-Ok "JAVA_HOME=$env:JAVA_HOME"
}

# ─── 4. Android SDK ──────────────────────────────────────────────────────────
Write-Host ""
Write-Info "Checking Android SDK..."

$androidHome = $env:ANDROID_HOME
if (-not $androidHome) { $androidHome = $env:ANDROID_SDK_ROOT }
if (-not $androidHome) {
    # Common Windows locations
    $candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk",
        "$env:USERPROFILE\Android\Sdk"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $androidHome = $c; break }
    }
}

function Install-AndroidSdk {
    $sdkDir = "$env:LOCALAPPDATA\Android\Sdk"
    New-Item -ItemType Directory -Path "$sdkDir\cmdline-tools" -Force | Out-Null

    $toolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $tmpZip = "$env:TEMP\android-cmdline-tools.zip"

    Write-Info "Downloading Android command-line tools..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $toolsUrl -OutFile $tmpZip -UseBasicParsing

    Write-Info "Extracting..."
    Expand-Archive -Path $tmpZip -DestinationPath "$sdkDir\cmdline-tools" -Force
    if (Test-Path "$sdkDir\cmdline-tools\cmdline-tools") {
        if (Test-Path "$sdkDir\cmdline-tools\latest") {
            Remove-Item "$sdkDir\cmdline-tools\latest" -Recurse -Force
        }
        Rename-Item "$sdkDir\cmdline-tools\cmdline-tools" "latest"
    }
    Remove-Item $tmpZip -Force

    $env:ANDROID_HOME = $sdkDir
    $env:Path = "$sdkDir\cmdline-tools\latest\bin;$sdkDir\platform-tools;$env:Path"

    Write-Info "Accepting licenses & installing platform-tools + SDK 31..."
    $sdkmanager = "$sdkDir\cmdline-tools\latest\bin\sdkmanager.bat"
    echo "y" | & $sdkmanager --licenses 2>$null
    & $sdkmanager "platform-tools" "platforms;android-31" "build-tools;31.0.0"

    $script:androidHome = $sdkDir
    Write-Ok "Android SDK installed at $sdkDir"
}

if ($androidHome -and (Test-Path $androidHome)) {
    Write-Ok "Android SDK found at $androidHome"
} else {
    Write-Warn "Android SDK not found."
    Install-AndroidSdk
}

# ─── 5. adb ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Info "Checking adb..."
$adbExe = if ($androidHome) { "$androidHome\platform-tools\adb.exe" } else { $null }

if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Ok "adb found: $((Get-Command adb).Source)"
} elseif ($adbExe -and (Test-Path $adbExe)) {
    Write-Ok "adb found: $adbExe"
    Write-Warn "adb is not on PATH. Add to your PATH: $androidHome\platform-tools"
} else {
    Write-Warn "adb not found. Installing platform-tools..."
    if ($androidHome) {
        & "$androidHome\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools"
    } else {
        Write-Fail "Cannot install adb without Android SDK. Install Android Studio or re-run this script."
    }
}

# ─── 6. React Native CLI ─────────────────────────────────────────────────────
Write-Host ""
Write-Info "Checking React Native CLI..."
try {
    $null = npx react-native --version 2>$null
    Write-Ok "react-native CLI available (via npx)"
} catch {
    Write-Warn "react-native CLI not accessible. Will be available after npm install."
}

# ─── 7. npm install ──────────────────────────────────────────────────────────
Write-Host ""
$scriptDir = Split-Path -Parent $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path) }
$projectDir = Split-Path -Parent $PSCommandPath | Split-Path -Parent

if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Info "Installing npm dependencies..."
    Push-Location $projectDir
    npm install
    Pop-Location
    Write-Ok "Dependencies installed"
} else {
    Write-Ok "node_modules already exists. Run 'npm install' to update."
}

# ─── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$missingEnv = @()
if (-not $env:JAVA_HOME)    { $missingEnv += "JAVA_HOME" }
if (-not $env:ANDROID_HOME) { $missingEnv += "ANDROID_HOME" }

if ($missingEnv.Count -gt 0) {
    Write-Warn "Set these environment variables permanently (System Properties > Environment Variables):"
    Write-Host ""
    if (-not $env:JAVA_HOME) {
        $jPath = Get-Command javac -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
        if ($jPath) { $jHome = Split-Path (Split-Path $jPath) } else { $jHome = "C:\Program Files\Microsoft\jdk-17" }
        Write-Host "  JAVA_HOME = $jHome" -ForegroundColor Cyan
    }
    if ($androidHome) {
        Write-Host "  ANDROID_HOME = $androidHome" -ForegroundColor Cyan
    } else {
        Write-Host "  ANDROID_HOME = $env:LOCALAPPDATA\Android\Sdk" -ForegroundColor Cyan
    }
    Write-Host "  PATH += %ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "  npm start        -> Start Metro bundler" -ForegroundColor Cyan
Write-Host "  npm run android  -> Run on Android" -ForegroundColor Cyan
Write-Host "  npm run ios      -> Run on iOS" -ForegroundColor Cyan
Write-Host ""
