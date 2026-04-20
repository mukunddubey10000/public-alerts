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

    Write-Info "Downloading Android command-line tools (~150 MB)..."
    Write-Info "  URL: $toolsUrl"
    Write-Info "  Destination: $tmpZip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    # Use .NET HttpClient with a streaming progress bar (fast, unlike Invoke-WebRequest)
    $prevPref = $ProgressPreference
    $ProgressPreference = 'SilentlyContinue'
    $downloadOk = $false
    try {
        Write-Info "  [1/2] Loading System.Net.Http assembly..."
        Add-Type -AssemblyName System.Net.Http
        Write-Info "  [1/2] Creating HttpClient (timeout: 10 min)..."
        $httpClient = New-Object System.Net.Http.HttpClient
        $httpClient.Timeout = [TimeSpan]::FromMinutes(10)
        Write-Info "  [1/2] Connecting to dl.google.com..."
        $response = $httpClient.GetAsync($toolsUrl, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).Result
        $statusCode = [int]$response.StatusCode
        if ($statusCode -ne 200) {
            throw "Server returned HTTP $statusCode"
        }
        Write-Info "  [1/2] Connected (HTTP $statusCode). Starting download..."

        $totalBytes = $response.Content.Headers.ContentLength
        if ($totalBytes -and $totalBytes -gt 0) {
            $totalMB = [math]::Round($totalBytes / 1MB, 1)
            Write-Info "  [1/2] File size: $totalMB MB"
        } else {
            Write-Warn "  [1/2] Server did not report file size - progress bar will be unavailable"
        }
        $stream = $response.Content.ReadAsStreamAsync().Result
        $fileStream = [System.IO.File]::Create($tmpZip)
        $buffer = New-Object byte[] 65536
        $downloaded = 0
        $lastPct = -1
        $lastReportTime = [System.Diagnostics.Stopwatch]::StartNew()
        $sw = [System.Diagnostics.Stopwatch]::StartNew()

        try {
            while (($bytesRead = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $fileStream.Write($buffer, 0, $bytesRead)
                $downloaded += $bytesRead
                # Report every 2 seconds or on percentage change
                $shouldReport = ($lastReportTime.Elapsed.TotalSeconds -ge 2)
                if ($totalBytes -and $totalBytes -gt 0) {
                    $pct = [math]::Floor(($downloaded / $totalBytes) * 100)
                    if ($pct -ne $lastPct) { $shouldReport = $true }
                } else {
                    $pct = -1
                }
                if ($shouldReport) {
                    $mbDown = [math]::Round($downloaded / 1MB, 1)
                    $elapsed = $sw.Elapsed.TotalSeconds
                    if ($elapsed -gt 0) {
                        $speed = [math]::Round(($downloaded / 1MB) / $elapsed, 1)
                    } else {
                        $speed = 0
                    }
                    if ($totalBytes -and $totalBytes -gt 0) {
                        $mbTotal = [math]::Round($totalBytes / 1MB, 1)
                        if ($speed -gt 0) {
                            $remaining = [math]::Round(($totalBytes - $downloaded) / 1MB / $speed, 0)
                            $eta = "${remaining}s left"
                        } else {
                            $eta = "calculating..."
                        }
                        Write-Host ("`r  [DOWNLOAD] {0}% - {1} / {2} MB  ({3} MB/s, {4})    " -f $pct, $mbDown, $mbTotal, $speed, $eta) -NoNewline -ForegroundColor Cyan
                    } else {
                        Write-Host ("`r  [DOWNLOAD] {0} MB downloaded  ({1} MB/s)    " -f $mbDown, $speed) -NoNewline -ForegroundColor Cyan
                    }
                    $lastPct = $pct
                    $lastReportTime.Restart()
                }
            }
            Write-Host ""  # newline after progress
        } catch {
            Write-Host ""  # newline after progress
            throw
        } finally {
            $fileStream.Close()
            $stream.Close()
        }
        $httpClient.Dispose()
        $sw.Stop()
        $dlSecs = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        $dlMB = [math]::Round($downloaded / 1MB, 1)
        Write-Ok ('Download complete ({0} MB in {1}s)' -f $dlMB, $dlSecs)
        $downloadOk = $true
    } catch {
        Write-Warn "HttpClient failed: $($_.Exception.Message)"
        Write-Info "  [2/2] Falling back to WebClient..."
        try {
            $wc = New-Object System.Net.WebClient
            Write-Info "  [2/2] Downloading via WebClient (no progress bar)..."
            $wc.DownloadFile($toolsUrl, $tmpZip)
            Write-Ok "WebClient download complete"
            $downloadOk = $true
        } catch {
            Write-Warn "WebClient also failed: $($_.Exception.Message)"
            Write-Info "  [LAST] Falling back to Invoke-WebRequest (slowest method)..."
            $ProgressPreference = $prevPref
            try {
                Invoke-WebRequest -Uri $toolsUrl -OutFile $tmpZip -UseBasicParsing
                Write-Ok "Invoke-WebRequest download complete"
                $downloadOk = $true
            } catch {
                Write-Fail "All download methods failed: $($_.Exception.Message)"
            }
        }
    } finally {
        $ProgressPreference = $prevPref
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
        Write-Fail "sdkmanager --licenses failed (exit code $LASTEXITCODE)"
        return
    }
    & $sdkmanager "platform-tools" "platforms;android-31" "build-tools;31.0.0"
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
        Write-Warn "Android SDK not available either. Installing full Android SDK first..."
        Install-AndroidSdk
        if ($detectedAndroidHome -and (Test-Path "$detectedAndroidHome\cmdline-tools\latest\bin\sdkmanager.bat")) {
            & "$detectedAndroidHome\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools"
            Set-PersistentEnv "ANDROID_HOME" $detectedAndroidHome
            Add-PersistentPath "$detectedAndroidHome\platform-tools"
            Write-Ok "Android SDK + adb installed at $detectedAndroidHome"
        } else {
            Write-Fail "Could not install Android SDK. Install Android Studio manually from https://developer.android.com/studio"
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# 5. React Native CLI
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Info "Checking React Native CLI..."
$null = npx react-native --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Ok "react-native CLI available (via npx)"
} else {
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
