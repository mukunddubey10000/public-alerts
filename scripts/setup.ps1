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
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

# ─── Persist an env var to User environment ───────────────────────────────────
function Set-PersistentEnv ($varName, $varValue) {
    if (-not (Test-Path $varValue)) {
        Write-Warn "Path does not exist yet: $varValue (setting $varName anyway for future sessions)"
    }
    Set-Item -Path "Env:\$varName" -Value $varValue
    [System.Environment]::SetEnvironmentVariable($varName, $varValue, "User")
    Write-Ok "Set $varName = $varValue (User environment)"
    $script:EnvChanged = $true
}

# ─── Append to User PATH if not already there ────────────────────────────────
function Add-PersistentPath ($entry) {
    # Always persist to registry (dir may be created later or in next session)
    $currentUserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentUserPath -and $currentUserPath.ToLower().Contains($entry.ToLower())) {
        # Already in User PATH registry — just ensure current session has it too
        if (-not $env:Path.ToLower().Contains($entry.ToLower())) {
            $env:Path = "$entry;$env:Path"
        }
        return
    }
    if ($currentUserPath) {
        $newPath = "$currentUserPath;$entry"
    } else {
        $newPath = $entry
    }
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
# 1. Node.js — pinned version via nvm-windows
# ═══════════════════════════════════════════════════════════════════════════════

# Required Node version (must match .nvmrc)
$RequiredNodeMajor = 16
$RequiredNodeMinMajor = 16
$RequiredNodeMaxMajor = 18  # inclusive

Write-Host ""
Write-Info "Checking Node.js (requires v${RequiredNodeMinMajor}.x - v${RequiredNodeMaxMajor}.x)..."

function Test-NodeVersion {
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) { return $false }
    $ver = (node -v) -replace '^v', ''
    $major = [int]($ver.Split('.')[0])
    return ($major -ge $RequiredNodeMinMajor -and $major -le $RequiredNodeMaxMajor)
}

function Find-NvmWindows {
    # Check if nvm command exists (nvm-windows)
    if (Get-Command nvm -ErrorAction SilentlyContinue) { return $true }
    # Check common install location
    $nvmPath = "$env:APPDATA\nvm\nvm.exe"
    if (Test-Path $nvmPath) {
        Add-PersistentPath "$env:APPDATA\nvm"
        Refresh-Path
        return $true
    }
    return $false
}

function Install-NvmWindows {
    Write-Info "Installing nvm-windows (Node Version Manager)..."
    $nvmVersion = "1.1.12"
    $nvmUrl = "https://github.com/coreybutler/nvm-windows/releases/download/$nvmVersion/nvm-setup.exe"
    $nvmInstaller = "$env:TEMP\nvm-setup.exe"

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $nvmUrl -OutFile $nvmInstaller -UseBasicParsing

    Write-Info "Running nvm-windows installer (follow the prompts)..."
    Start-Process -FilePath $nvmInstaller -Wait
    Remove-Item $nvmInstaller -Force -ErrorAction SilentlyContinue

    Refresh-Path
    if (Get-Command nvm -ErrorAction SilentlyContinue) {
        Write-Ok "nvm-windows installed"
    } else {
        Write-Warn "nvm-windows installed but not on PATH yet. Restart your terminal after setup."
    }
}

if (Test-NodeVersion) {
    Write-Ok "Node.js $(node -v) (compatible)"
} else {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Warn "Node.js $(node -v) found but not compatible (need v${RequiredNodeMinMajor}.x - v${RequiredNodeMaxMajor}.x)"
    } else {
        Write-Warn "Node.js not found."
    }

    # Try to use nvm-windows
    if (-not (Find-NvmWindows)) {
        Install-NvmWindows
    }

    if (Get-Command nvm -ErrorAction SilentlyContinue) {
        Write-Info "Installing Node.js v$RequiredNodeMajor via nvm..."
        nvm install $RequiredNodeMajor
        nvm use $RequiredNodeMajor
        Refresh-Path

        if (Test-NodeVersion) {
            Write-Ok "Node.js $(node -v) installed via nvm-windows"
        } else {
            Write-Warn "Node installed but version check failed. Restart your terminal."
        }
    } else {
        # Fallback: direct install of Node 16 LTS via winget/choco
        Write-Warn "nvm not available. Installing Node.js v$RequiredNodeMajor directly..."
        Install-WithPkgManager "Node.js $RequiredNodeMajor" "OpenJS.NodeJS.LTS" "nodejs-lts"
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

# Validate existing JAVA_HOME first - clear if invalid BEFORE detection
if ($env:JAVA_HOME -and -not (Test-Path "$env:JAVA_HOME\bin\javac.exe")) {
    Write-Warn "Existing JAVA_HOME is invalid: $env:JAVA_HOME"
    Write-Info "Clearing stale JAVA_HOME..."
    [System.Environment]::SetEnvironmentVariable("JAVA_HOME", $null, "User")
    $env:JAVA_HOME = $null
    $script:EnvChanged = $true
}

function Find-JavaHome {
    # 1) If javac is already on PATH
    $javacCmd = Get-Command javac -ErrorAction SilentlyContinue
    if ($javacCmd) {
        $jHome = Split-Path (Split-Path $javacCmd.Source)
        if (Test-Path "$jHome\bin\javac.exe") { return $jHome }
    }

    # 2) Scan known directories across all drives (C: first)
    $jdkCandidates = @()
    $jdkVersions = @(8, 11, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26)
    foreach ($d in $drives) {
        # Microsoft OpenJDK (all common versions)
        foreach ($ver in $jdkVersions) {
            $jdkCandidates += "${d}:\Program Files\Microsoft\jdk-${ver}*"
        }
        $jdkCandidates += "${d}:\Program Files\Microsoft\jdk-*"
        # Oracle / Temurin / Zulu / Corretto (all versions)
        $jdkCandidates += "${d}:\Program Files\Java\jdk*"
        foreach ($ver in $jdkVersions) {
            $jdkCandidates += "${d}:\Program Files\Eclipse Adoptium\jdk-${ver}*"
            $jdkCandidates += "${d}:\Program Files\Zulu\zulu-${ver}*"
            $jdkCandidates += "${d}:\Program Files\Amazon Corretto\jdk${ver}*"
        }
        $jdkCandidates += "${d}:\Program Files\Eclipse Adoptium\jdk-*"
        $jdkCandidates += "${d}:\Program Files\Zulu\zulu-*"
        $jdkCandidates += "${d}:\Program Files\Amazon Corretto\jdk*"
        # x86 variants
        $jdkCandidates += "${d}:\Program Files (x86)\Java\jdk*"
        # Android Studio bundled JDK
        $jdkCandidates += "${d}:\Program Files\Android\Android Studio\jbr"
        $jdkCandidates += "${d}:\Program Files\Android\Android Studio\jre"
    }
    # User-level (IntelliJ, sdkman-like)
    $jdkCandidates += "$env:USERPROFILE\.jdks\*"
    $jdkCandidates += "$env:LOCALAPPDATA\Programs\Eclipse Adoptium\*"

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
    if (-not $detectedJavaHome) {
        # Try harder: search everywhere for javac.exe
        Write-Info "Scanning all drives for javac.exe (this may take a moment)..."
        foreach ($d in $drives) {
            $found = Get-ChildItem -Path "${d}:\Program Files*" -Recurse -Filter "javac.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $detectedJavaHome = Split-Path (Split-Path $found.FullName)
                break
            }
        }
    }
    if ($detectedJavaHome) {
        Write-Ok "JDK 17 installed at $detectedJavaHome"
    } else {
    Write-Fail "JDK installed but could not auto-detect path."
    Write-Fail "Please install JDK 17 manually from https://adoptium.net/ and then either:"
    Write-Fail "  1. Set JAVA_HOME in System Environment Variables to your JDK folder, OR"
    Write-Fail "  2. Re-run this setup script after installing"
    }
}

# Set JAVA_HOME persistently right after install
if ($detectedJavaHome) {
    Set-PersistentEnv "JAVA_HOME" $detectedJavaHome
    Add-PersistentPath "$detectedJavaHome\bin"
    # Verify it works
    try {
        $verifyVer = & "$env:JAVA_HOME\bin\javac.exe" -version 2>&1
        Write-Ok "JAVA_HOME verified: $env:JAVA_HOME ($verifyVer)"
    } catch {
        Write-Fail "JAVA_HOME set to $env:JAVA_HOME but javac verification failed."
        Write-Fail "Try opening a NEW terminal and running: javac -version"
    }
} else {
    Write-Fail "JAVA_HOME could not be set."
    Write-Fail "Install JDK 17 from https://adoptium.net/ then set JAVA_HOME manually."
    Write-Fail "After installing, re-run: npm run setup"
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

    Write-Info "Downloading Android command-line tools (~150 MB)..."
    Write-Info "  URL: $toolsUrl"
    Write-Info "  Destination: $tmpZip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $downloadOk = $false
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    # Method 1: WebClient with native-speed download + progress events
    try {
        Write-Info "  Connecting to dl.google.com..."
        $wc = New-Object System.Net.WebClient
        $lastPct = -1
        $progressAction = {
            $pct = $EventArgs.ProgressPercentage
            if ($pct -ne $script:lastPct) {
                $script:lastPct = $pct
                $mbDown = [math]::Round($EventArgs.BytesReceived / 1MB, 1)
                $mbTotal = [math]::Round($EventArgs.TotalBytesToReceive / 1MB, 1)
                $elapsed = $script:sw.Elapsed.TotalSeconds
                if ($elapsed -gt 0) {
                    $speed = [math]::Round($mbDown / $elapsed, 1)
                } else {
                    $speed = 0
                }
                if ($speed -gt 0 -and $mbTotal -gt 0) {
                    $remaining = [math]::Round(($mbTotal - $mbDown) / $speed, 0)
                    $eta = "${remaining}s left"
                } else {
                    $eta = "calculating..."
                }
                Write-Host ("`r  [DOWNLOAD] {0}% - {1} / {2} MB  ({3} MB/s, {4})    " -f $pct, $mbDown, $mbTotal, $speed, $eta) -NoNewline -ForegroundColor Cyan
            }
        }
        Register-ObjectEvent -InputObject $wc -EventName DownloadProgressChanged -Action $progressAction -SourceIdentifier 'DLProgress' | Out-Null
        $task = $wc.DownloadFileTaskAsync($toolsUrl, $tmpZip)
        # Poll until done — allows progress events to fire
        while (-not $task.IsCompleted) {
            [System.Threading.Thread]::Sleep(100)
        }
        Write-Host ""
        Unregister-Event -SourceIdentifier 'DLProgress' -ErrorAction SilentlyContinue
        if ($task.IsFaulted) {
            throw $task.Exception.InnerException
        }
        $sw.Stop()
        $dlSecs = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        $dlMB = [math]::Round((Get-Item $tmpZip).Length / 1MB, 1)
        Write-Ok ('Download complete ({0} MB in {1}s)' -f $dlMB, $dlSecs)
        $downloadOk = $true
    } catch {
        Write-Host ""
        Unregister-Event -SourceIdentifier 'DLProgress' -ErrorAction SilentlyContinue
        Write-Warn "WebClient failed: $($_.Exception.Message)"
        # Method 2: Invoke-WebRequest (no progress bar, but native speed)
        Write-Info "  Falling back to Invoke-WebRequest..."
        $prevPref = $ProgressPreference
        try {
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri $toolsUrl -OutFile $tmpZip -UseBasicParsing
            $sw.Stop()
            $dlSecs = [math]::Round($sw.Elapsed.TotalSeconds, 1)
            $dlMB = [math]::Round((Get-Item $tmpZip).Length / 1MB, 1)
            Write-Ok ('Download complete ({0} MB in {1}s)' -f $dlMB, $dlSecs)
            $downloadOk = $true
        } catch {
            Write-Fail "All download methods failed: $($_.Exception.Message)"
        } finally {
            $ProgressPreference = $prevPref
        }
    }

    if (-not $downloadOk) {
        Write-Fail "Could not download Android SDK. Check your internet and firewall settings."
        return
    }

    if (-not (Test-Path $tmpZip)) {
        Write-Fail "Download file not found at $tmpZip"
        return
    }
    $zipSize = (Get-Item $tmpZip).Length
    if ($zipSize -lt 1000000) {
        $zipKB = [math]::Round($zipSize / 1KB, 1)
        Write-Fail ('Download file too small ({0} KB) - likely incomplete or corrupted.' -f $zipKB)
        Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
        return
    }
    $zipMB = [math]::Round($zipSize / 1MB, 1)
    Write-Info "Downloaded file size: $zipMB MB - looks valid"

    Write-Info "Extracting to $sdkDir..."
    try {
        Expand-Archive -Path $tmpZip -DestinationPath "$sdkDir\cmdline-tools" -Force
    } catch {
        Write-Fail "Extraction failed: $($_.Exception.Message)"
        Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
        return
    }
    if (Test-Path "$sdkDir\cmdline-tools\cmdline-tools") {
        if (Test-Path "$sdkDir\cmdline-tools\latest") {
            Remove-Item "$sdkDir\cmdline-tools\latest" -Recurse -Force
        }
        Rename-Item -Path "$sdkDir\cmdline-tools\cmdline-tools" -NewName "latest"
    }
    Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
    Write-Ok "Extraction complete"

    if (-not (Test-Path "$sdkDir\cmdline-tools\latest\bin\sdkmanager.bat")) {
        Write-Fail "sdkmanager not found after extraction - zip may be corrupted"
        return
    }

    $env:ANDROID_HOME = $sdkDir
    $env:Path = "$sdkDir\cmdline-tools\latest\bin;$sdkDir\platform-tools;$env:Path"

    Write-Info "Accepting licenses & installing platform-tools + SDK 31..."
    $sdkmanager = "$sdkDir\cmdline-tools\latest\bin\sdkmanager.bat"
    "y" | & $sdkmanager --licenses 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "sdkmanager --licenses returned exit code $LASTEXITCODE (continuing anyway)"
    }
    & $sdkmanager "platform-tools" "platforms;android-31" "build-tools;30.0.3"
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "sdkmanager install failed (exit code $LASTEXITCODE)"
        return
    }

    $script:detectedAndroidHome = $sdkDir
    Write-Ok "Android SDK installed at $sdkDir"
}

if ($detectedAndroidHome) {
    Write-Ok "Android SDK found at: $detectedAndroidHome"
} else {
    Write-Warn "Android SDK not found on any drive."
    Install-AndroidSdk
    # Re-read the variable set by Install-AndroidSdk
    $detectedAndroidHome = $script:detectedAndroidHome
}

# Validate existing ANDROID_HOME — clear it if it points to a bad path
if ($env:ANDROID_HOME -and -not (Test-Path $env:ANDROID_HOME)) {
    Write-Warn "Existing ANDROID_HOME is invalid: $env:ANDROID_HOME"
    Write-Info "Clearing stale ANDROID_HOME..."
    [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $null, "User")
    $env:ANDROID_HOME = $null
    $script:EnvChanged = $true
}

# Set ANDROID_HOME persistently right after install
if ($detectedAndroidHome) {
    if ($env:ANDROID_HOME -ne $detectedAndroidHome) {
        Set-PersistentEnv "ANDROID_HOME" $detectedAndroidHome
    } else {
        Write-Ok "ANDROID_HOME already set: $env:ANDROID_HOME"
    }

    Add-PersistentPath "$detectedAndroidHome\platform-tools"
    $cmdToolsBin = "$detectedAndroidHome\cmdline-tools\latest\bin"
    if (Test-Path $cmdToolsBin) {
        Add-PersistentPath $cmdToolsBin
    }

    # Verify it works
    Write-Info "Verifying ANDROID_HOME..."
    if (Test-Path $env:ANDROID_HOME) {
        Write-Ok "ANDROID_HOME verified: $env:ANDROID_HOME"
    } else {
        Write-Fail "ANDROID_HOME verification failed. Directory not found: $env:ANDROID_HOME"
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
    Add-PersistentPath "$detectedAndroidHome\platform-tools"
    Refresh-Path
    Write-Ok "adb: $detectedAndroidHome\platform-tools\adb.exe"
} else {
    Write-Warn "adb not found. Installing platform-tools..."
    if ($detectedAndroidHome -and (Test-Path "$detectedAndroidHome\cmdline-tools\latest\bin\sdkmanager.bat")) {
        & "$detectedAndroidHome\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools"
        if ($LASTEXITCODE -eq 0) {
            Add-PersistentPath "$detectedAndroidHome\platform-tools"
            Refresh-Path
            Write-Ok "adb installed via sdkmanager"
        } else {
            Write-Fail "sdkmanager platform-tools failed (exit code $LASTEXITCODE)"
        }
    } else {
        Write-Warn "Android SDK not available either. Installing full Android SDK first..."
        Install-AndroidSdk
        $detectedAndroidHome = $script:detectedAndroidHome
        if ($detectedAndroidHome -and (Test-Path "$detectedAndroidHome\platform-tools\adb.exe")) {
            Set-PersistentEnv "ANDROID_HOME" $detectedAndroidHome
            Add-PersistentPath "$detectedAndroidHome\platform-tools"
            Refresh-Path
            Write-Ok "Android SDK + adb installed at $detectedAndroidHome"
        } else {
            Write-Fail "Could not install Android SDK. Install Android Studio manually from https://developer.android.com/studio"
        }
    }
}

# Final adb verification
Write-Host ""
Write-Info "Verifying adb is usable..."
Refresh-Path
if (Get-Command adb -ErrorAction SilentlyContinue) {
    $adbVer = adb version 2>&1 | Select-Object -First 1
    Write-Ok "adb works: $adbVer"
} elseif ($detectedAndroidHome -and (Test-Path "$detectedAndroidHome\platform-tools\adb.exe")) {
    $adbVer = & "$detectedAndroidHome\platform-tools\adb.exe" version 2>&1 | Select-Object -First 1
    Write-Ok "adb works (via full path): $adbVer"
    Write-Warn "adb is not on PATH in this session. Open a new terminal for it to work."
} else {
    Write-Fail "adb is NOT available. Android builds will fail."
    Write-Info "  Try: Open a NEW PowerShell window and run 'adb version'"
    Write-Info "  If that fails, install Android Studio from https://developer.android.com/studio"
}

# ═══════════════════════════════════════════════════════════════════════════════
# 4b. Connected devices check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Checking for connected Android devices..."

$adbCmd = $null
if (Get-Command adb -ErrorAction SilentlyContinue) {
    $adbCmd = "adb"
} elseif ($detectedAndroidHome -and (Test-Path "$detectedAndroidHome\platform-tools\adb.exe")) {
    $adbCmd = "$detectedAndroidHome\platform-tools\adb.exe"
}

if ($adbCmd) {
    $devices = & $adbCmd devices 2>&1
    $connectedDevices = ($devices | Select-String -Pattern "^\S+\s+(device|unauthorized|offline)" | Measure-Object).Count
    $unauthorizedDevices = ($devices | Select-String -Pattern "unauthorized" | Measure-Object).Count

    if ($connectedDevices -eq 0) {
        Write-Warn "No Android devices detected."
        Write-Info "  To connect your physical Android device via USB:"
        Write-Info "    1. Enable Developer Options: Settings > About Phone > tap 'Build Number' 7 times"
        Write-Info "    2. Enable USB Debugging: Settings > Developer Options > USB Debugging"
        Write-Info "    3. Connect phone via USB cable (make sure it supports data transfer, not charge-only)"
        Write-Info "    4. When prompted on phone, tap 'Allow USB Debugging' (check 'Always allow')"
        Write-Info "    5. Run: adb devices"
        Write-Info ""
        Write-Info "  If your device still doesn't appear:"
        Write-Info "    - Try a different USB cable or port"
        Write-Info "    - Revoke USB debugging authorizations on phone, then re-allow"
        Write-Info "    - Run: adb kill-server; adb devices"
    } elseif ($unauthorizedDevices -gt 0) {
        Write-Warn "Device connected but not authorized."
        Write-Info "  Check your phone - tap 'Allow USB Debugging' on the popup."
        Write-Info "  If no popup appears:"
        Write-Info "    1. Go to Settings > Developer Options > Revoke USB Debugging Authorizations"
        Write-Info "    2. Unplug and replug the USB cable"
        Write-Info "    3. Run: adb kill-server; adb devices"
    } else {
        $deviceList = $devices | Select-String -Pattern "^\S+\s+device$"
        foreach ($dev in $deviceList) {
            $devId = ($dev -split "\s+")[0]
            $model = (& $adbCmd -s $devId shell getprop ro.product.model 2>$null)
            if ($model) {
                Write-Ok "Device connected: $model ($devId)"
            } else {
                Write-Ok "Device connected: $devId"
            }
        }
        # Set up port forwarding so Metro bundler can reach the device
        Write-Info "Setting up adb reverse port forwarding for Metro..."
        try {
            & $adbCmd reverse tcp:8081 tcp:8081 2>$null
            Write-Ok "adb reverse tcp:8081 tcp:8081 (Metro bundler will connect to device)"
        } catch {
            Write-Warn "adb reverse failed - you may need to run it manually: adb reverse tcp:8081 tcp:8081"
        }
    }
} else {
    Write-Warn "adb not available - cannot check for connected devices."
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. React Native CLI
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Checking React Native CLI..."
$projectDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
if (Test-Path "$projectDir\node_modules\.bin\react-native.cmd") {
    Write-Ok "react-native CLI available (local)"
} elseif (Get-Command react-native -ErrorAction SilentlyContinue) {
    Write-Ok "react-native CLI available (global)"
} else {
    Write-Warn "react-native CLI not found yet. Will be available after npm install."
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5b. Generate android\local.properties
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Generating android\local.properties..."
$localProps = Join-Path $projectDir "android\local.properties"
$propsContent = @("# Generated by CivicAlerts setup script - do not commit")
if ($env:ANDROID_HOME) {
    $sdkDirEscaped = $env:ANDROID_HOME -replace '\\', '\\\\'
    $propsContent += "sdk.dir=$sdkDirEscaped"
}
if ($env:JAVA_HOME) {
    $javaHomeEscaped = $env:JAVA_HOME -replace '\\', '\\\\'
    $propsContent += "org.gradle.java.home=$javaHomeEscaped"
}
$propsContent -join "`n" | Set-Content -Path $localProps -Encoding UTF8
Write-Ok "Wrote $localProps"

# ═══════════════════════════════════════════════════════════════════════════════
# 6. npm install
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""

if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Info "Installing npm dependencies..."
    Push-Location $projectDir
    npm install
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm install failed (exit code $LASTEXITCODE)"
    } else {
        Write-Ok "Dependencies installed"
    }
} else {
    Write-Ok "node_modules already exists. Run 'npm install' to update."
}

# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
if ($env:JAVA_HOME) { $javaDisplay = $env:JAVA_HOME } else { $javaDisplay = '<not set>' }
if ($env:ANDROID_HOME) { $androidDisplay = $env:ANDROID_HOME } else { $androidDisplay = '<not set>' }
Write-Host "  JAVA_HOME     = " -NoNewline
Write-Host "$javaDisplay" -ForegroundColor Cyan
Write-Host "  ANDROID_HOME  = " -NoNewline
Write-Host "$androidDisplay" -ForegroundColor Cyan
Write-Host ""

if ($script:EnvChanged) {
    Write-Warn "Environment variables were updated. Restart your terminal for changes to take full effect."
    Write-Host ""
}

Write-Host "  " -NoNewline; Write-Host "npm start" -ForegroundColor Cyan -NoNewline; Write-Host "        $([char]0x2192) Start Metro bundler"
Write-Host "  " -NoNewline; Write-Host "npm run android" -ForegroundColor Cyan -NoNewline; Write-Host "  $([char]0x2192) Run on Android"
Write-Host "  " -NoNewline; Write-Host "npm run ios" -ForegroundColor Cyan -NoNewline; Write-Host "      $([char]0x2192) Run on iOS"
Write-Host ""
