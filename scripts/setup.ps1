#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Colors ───────────────────────────────────────────────────────────────────
function Write-Info  ($msg) { Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok    ($msg) { Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn  ($msg) { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Fail  ($msg) { Write-Host "[FAIL]  $msg" -ForegroundColor Red }

$script:EnvChanged = $false

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
        Write-Fail "No package manager found. Install winget (App Installer from Microsoft Store) or Chocolatey (https://chocolatey.org/install) first."
        exit 1
    }
}

# ─── Refresh PATH within the current session ─────────────────────────────────
function Refresh-Path {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# ─── Persist an env var to User environment ───────────────────────────────────
function Set-PersistentEnv ($varName, $varValue) {
    Set-Item -Path "Env:\$varName" -Value $varValue
    [System.Environment]::SetEnvironmentVariable($varName, $varValue, "User")
    Write-Ok "Set $varName = $varValue (User environment)"
    $script:EnvChanged = $true
}

# ─── Append to User PATH if not already there ────────────────────────────────
function Add-PersistentPath ($entry) {
    $currentUserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentUserPath -and $currentUserPath.ToLower().Contains($entry.ToLower())) {
        return  # already present
    }
    $newPath = if ($currentUserPath) { "$currentUserPath;$entry" } else { $entry }
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = "$entry;$env:Path"  # current session
    Write-Ok "Added to PATH: $entry"
    $script:EnvChanged = $true
}

# ─── Scan directories, return first that exists ──────────────────────────────
function Find-FirstPath {
    param([string[]]$Candidates)
    foreach ($c in $Candidates) {
        # Expand wildcards
        $resolved = Resolve-Path -Path $c -ErrorAction SilentlyContinue
        if ($resolved) {
            foreach ($r in $resolved) {
                if (Test-Path $r.Path) { return $r.Path }
            }
        }
    }
    return $null
}

# ─── Get all drive letters (prefer C:, then others) ──────────────────────────
function Get-DriveLetters {
    $drives = @("C")
    Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ne "C" -and $_.Name.Length -eq 1 } |
        ForEach-Object { $drives += $_.Name }
    return $drives
}

Write-Host ""
Write-Info "Platform: Windows ($([System.Environment]::OSVersion.VersionString))"
$drives = Get-DriveLetters
Write-Info "Available drives: $($drives -join ', '):"

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Node.js
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Checking Node.js..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Ok "Node.js $(node -v)"
} else {
    # Scan for existing node installation
    $nodeCandidates = @()
    foreach ($d in $drives) {
        $nodeCandidates += "${d}:\Program Files\nodejs\node.exe"
        $nodeCandidates += "${d}:\Program Files (x86)\nodejs\node.exe"
        $nodeCandidates += "$env:APPDATA\nvm\*\node.exe"
    }
    $found = Find-FirstPath $nodeCandidates
    if ($found) {
        $nodeDir = Split-Path $found
        Add-PersistentPath $nodeDir
        Refresh-Path
        Write-Ok "Node.js found at $found, added to PATH"
    } else {
        Write-Warn "Node.js not found anywhere."
        Install-WithPkgManager "Node.js" "OpenJS.NodeJS.LTS" "nodejs-lts"
        Refresh-Path
    }
}

Write-Info "Checking npm..."
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Ok "npm $(npm -v)"
} else {
    Write-Warn "npm not found (should come with Node.js). Refresh your terminal."
}

# ═══════════════════════════════════════════════════════════════════════════════
# 2. JDK — scan all drives for known paths, install if missing, set JAVA_HOME
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Checking JDK..."

function Find-JavaHome {
    # 1) If javac is already on PATH
    $javacCmd = Get-Command javac -ErrorAction SilentlyContinue
    if ($javacCmd) {
        $jHome = Split-Path (Split-Path $javacCmd.Source)
        if (Test-Path "$jHome\bin\javac.exe") { return $jHome }
    }

    # 2) Scan known directories across all drives (C: first)
    $jdkCandidates = @()
    foreach ($d in $drives) {
        # Microsoft OpenJDK
        $jdkCandidates += "${d}:\Program Files\Microsoft\jdk-17*"
        $jdkCandidates += "${d}:\Program Files\Microsoft\jdk-21*"
        # Oracle / Temurin / Zulu / Corretto
        $jdkCandidates += "${d}:\Program Files\Java\jdk-17*"
        $jdkCandidates += "${d}:\Program Files\Java\jdk-21*"
        $jdkCandidates += "${d}:\Program Files\Java\jdk*"
        $jdkCandidates += "${d}:\Program Files\Eclipse Adoptium\jdk-17*"
        $jdkCandidates += "${d}:\Program Files\Eclipse Adoptium\jdk-21*"
        $jdkCandidates += "${d}:\Program Files\Zulu\zulu-17*"
        $jdkCandidates += "${d}:\Program Files\Amazon Corretto\jdk17*"
        # x86 variants
        $jdkCandidates += "${d}:\Program Files (x86)\Java\jdk*"
        # Android Studio bundled JDK
        $jdkCandidates += "${d}:\Program Files\Android\Android Studio\jbr"
        $jdkCandidates += "${d}:\Program Files\Android\Android Studio\jre"
    }
    # User-level
    $jdkCandidates += "$env:USERPROFILE\.jdks\*"

    foreach ($pattern in $jdkCandidates) {
        $resolved = Resolve-Path -Path $pattern -ErrorAction SilentlyContinue
        if ($resolved) {
            foreach ($r in $resolved) {
                if (Test-Path "$($r.Path)\bin\javac.exe") {
                    return $r.Path
                }
            }
        }
    }
    return $null
}

$detectedJavaHome = Find-JavaHome

if ($detectedJavaHome) {
    $javaVer = & "$detectedJavaHome\bin\javac.exe" -version 2>&1
    Write-Ok "JDK found: $detectedJavaHome ($javaVer)"
} else {
    Write-Warn "JDK not found on any drive. Installing JDK 17..."
    Install-WithPkgManager "JDK 17" "Microsoft.OpenJDK.17" "openjdk17"
    Refresh-Path
    $detectedJavaHome = Find-JavaHome
    if ($detectedJavaHome) {
        Write-Ok "JDK 17 installed at $detectedJavaHome"
    } else {
        Write-Warn "JDK installed but could not auto-detect path. You may need to set JAVA_HOME manually."
    }
}

# Set JAVA_HOME persistently
if ($detectedJavaHome) {
    if ($env:JAVA_HOME -ne $detectedJavaHome) {
        Set-PersistentEnv "JAVA_HOME" $detectedJavaHome
    } else {
        Write-Ok "JAVA_HOME already set: $env:JAVA_HOME"
    }
    # Ensure bin is on PATH
    Add-PersistentPath "$detectedJavaHome\bin"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Android SDK — scan all drives, install if missing, set ANDROID_HOME
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Checking Android SDK..."

function Find-AndroidHome {
    # 1) Check env vars
    foreach ($var in @("ANDROID_HOME", "ANDROID_SDK_ROOT")) {
        $val = [System.Environment]::GetEnvironmentVariable($var, "User")
        if (-not $val) { $val = [System.Environment]::GetEnvironmentVariable($var, "Machine") }
        if ($val -and (Test-Path $val)) { return $val }
    }

    # 2) Scan common locations across all drives (C: first)
    $sdkCandidates = @()
    foreach ($d in $drives) {
        $sdkCandidates += "${d}:\Android\Sdk"
        $sdkCandidates += "${d}:\Android\sdk"
        $sdkCandidates += "${d}:\android-sdk"
    }
    # User-local (most common Windows default)
    $sdkCandidates += "$env:LOCALAPPDATA\Android\Sdk"
    $sdkCandidates += "$env:USERPROFILE\AppData\Local\Android\Sdk"
    $sdkCandidates += "$env:USERPROFILE\Android\Sdk"

    foreach ($c in $sdkCandidates) {
        if (Test-Path $c) { return $c }
    }
    return $null
}

$detectedAndroidHome = Find-AndroidHome

function Install-AndroidSdk {
    # Prefer C:\Android\Sdk for clean path
    $sdkDir = "C:\Android\Sdk"
    New-Item -ItemType Directory -Path "$sdkDir\cmdline-tools" -Force | Out-Null

    $toolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    $tmpZip = "$env:TEMP\android-cmdline-tools.zip"

    Write-Info "Downloading Android command-line tools..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $toolsUrl -OutFile $tmpZip -UseBasicParsing

    Write-Info "Extracting to $sdkDir..."
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

    $script:detectedAndroidHome = $sdkDir
    Write-Ok "Android SDK installed at $sdkDir"
}

if ($detectedAndroidHome) {
    Write-Ok "Android SDK found at: $detectedAndroidHome"
} else {
    Write-Warn "Android SDK not found on any drive."
    Install-AndroidSdk
}

# Set ANDROID_HOME persistently
if ($detectedAndroidHome) {
    if ($env:ANDROID_HOME -ne $detectedAndroidHome) {
        Set-PersistentEnv "ANDROID_HOME" $detectedAndroidHome
    } else {
        Write-Ok "ANDROID_HOME already set: $env:ANDROID_HOME"
    }

    # Ensure platform-tools & cmdline-tools on PATH
    Add-PersistentPath "$detectedAndroidHome\platform-tools"
    $cmdToolsBin = "$detectedAndroidHome\cmdline-tools\latest\bin"
    if (Test-Path $cmdToolsBin) {
        Add-PersistentPath $cmdToolsBin
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 4. adb
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Checking adb..."

if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Ok "adb: $((Get-Command adb).Source)"
} elseif ($detectedAndroidHome -and (Test-Path "$detectedAndroidHome\platform-tools\adb.exe")) {
    Write-Ok "adb: $detectedAndroidHome\platform-tools\adb.exe"
} else {
    Write-Warn "adb not found. Installing platform-tools..."
    if ($detectedAndroidHome -and (Test-Path "$detectedAndroidHome\cmdline-tools\latest\bin\sdkmanager.bat")) {
        & "$detectedAndroidHome\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools"
        Write-Ok "adb installed via sdkmanager"
    } else {
        Write-Fail "Cannot install adb without Android SDK."
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. React Native CLI
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Checking React Native CLI..."
try {
    $null = npx react-native --version 2>$null
    Write-Ok "react-native CLI available (via npx)"
} catch {
    Write-Warn "react-native CLI not accessible. Will be available after npm install."
}

# ═══════════════════════════════════════════════════════════════════════════════
# 6. npm install
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
$projectDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Info "Installing npm dependencies..."
    Push-Location $projectDir
    npm install
    Pop-Location
    Write-Ok "Dependencies installed"
} else {
    Write-Ok "node_modules already exists. Run 'npm install' to update."
}

# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
$javaDisplay = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { '<not set>' }
$androidDisplay = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { '<not set>' }
Write-Host "  JAVA_HOME    = $javaDisplay" -ForegroundColor Cyan
Write-Host "  ANDROID_HOME = $androidDisplay" -ForegroundColor Cyan
Write-Host ""

if ($script:EnvChanged) {
    Write-Warn "Environment variables were updated. Restart your terminal for changes to take full effect."
    Write-Host ""
}

Write-Host "  npm start        -> Start Metro bundler" -ForegroundColor Cyan
Write-Host "  npm run android  -> Run on Android" -ForegroundColor Cyan
Write-Host "  npm run ios      -> Run on iOS" -ForegroundColor Cyan
Write-Host ""
