#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; }

# ─── OS Detection ─────────────────────────────────────────────────────────────
OS="$(uname -s)"
case "$OS" in
  Darwin)       PLATFORM="mac" ;;
  Linux)        PLATFORM="linux" ;;
  MINGW*|MSYS*) fail "Detected Git Bash / MSYS on Windows."
                fail "Run this instead:  powershell -ExecutionPolicy Bypass -File scripts/setup.ps1"
                fail "Or use:  npm run setup  (auto-detects OS)"
                exit 1 ;;
  *)            fail "Unsupported OS: $OS"; exit 1 ;;
esac
info "Detected platform: $PLATFORM"

# ─── Linux distro / package manager detection ────────────────────────────────
PKG_MGR=""
if [[ "$PLATFORM" == "linux" ]]; then
  if command -v apt-get &>/dev/null; then
    PKG_MGR="apt"
  elif command -v dnf &>/dev/null; then
    PKG_MGR="dnf"
  elif command -v yum &>/dev/null; then
    PKG_MGR="yum"
  elif command -v pacman &>/dev/null; then
    PKG_MGR="pacman"
  elif command -v zypper &>/dev/null; then
    PKG_MGR="zypper"
  else
    warn "Could not detect Linux package manager (apt/dnf/yum/pacman/zypper)."
    warn "You may need to install dependencies manually."
  fi
  [[ -n "$PKG_MGR" ]] && info "Linux package manager: $PKG_MGR"
fi

# ─── Shell profile detection ─────────────────────────────────────────────────
detect_shell_profile() {
  if [[ "$PLATFORM" == "mac" ]]; then
    # macOS defaults to zsh since Catalina
    if [[ -f "$HOME/.zshrc" ]] || [[ "$SHELL" == *zsh* ]]; then
      echo "$HOME/.zshrc"
    elif [[ -f "$HOME/.bash_profile" ]]; then
      echo "$HOME/.bash_profile"
    else
      echo "$HOME/.zshrc"
    fi
  else
    # Linux
    if [[ "$SHELL" == *zsh* ]] && [[ -f "$HOME/.zshrc" ]]; then
      echo "$HOME/.zshrc"
    elif [[ -f "$HOME/.bashrc" ]]; then
      echo "$HOME/.bashrc"
    else
      echo "$HOME/.bashrc"
    fi
  fi
}

SHELL_PROFILE="$(detect_shell_profile)"
info "Shell profile: $SHELL_PROFILE"
ENV_CHANGED=false

# ─── Persist an env var to shell profile ──────────────────────────────────────
persist_env() {
  local var_name="$1"
  local var_value="$2"

  if [[ ! -d "$var_value" ]]; then
    warn "Path does not exist yet: $var_value (setting $var_name anyway for future sessions)"
  fi

  # Export in current session
  export "$var_name"="$var_value"

  # Add to shell profile if not already there
  if ! grep -q "^export ${var_name}=" "$SHELL_PROFILE" 2>/dev/null; then
    echo "" >> "$SHELL_PROFILE"
    echo "# Added by CivicAlerts setup" >> "$SHELL_PROFILE"
    echo "export ${var_name}=\"${var_value}\"" >> "$SHELL_PROFILE"
    ok "Persisted $var_name to $SHELL_PROFILE"
    ENV_CHANGED=true
  else
    # Update existing value
    if [[ "$PLATFORM" == "mac" ]]; then
      sed -i '' "s|^export ${var_name}=.*|export ${var_name}=\"${var_value}\"|" "$SHELL_PROFILE"
    else
      sed -i "s|^export ${var_name}=.*|export ${var_name}=\"${var_value}\"|" "$SHELL_PROFILE"
    fi
    ok "Updated $var_name in $SHELL_PROFILE"
    ENV_CHANGED=true
  fi
}

# ─── Persist a PATH entry to shell profile ────────────────────────────────────
persist_path_entry() {
  local entry="$1"

  if [[ ! -d "$entry" ]]; then
    warn "Directory does not exist yet: $entry (adding to PATH anyway for future sessions)"
  fi

  # Add to current session
  export PATH="$entry:$PATH"

  # Add to shell profile if not already there
  if ! grep -qF "$entry" "$SHELL_PROFILE" 2>/dev/null; then
    echo "export PATH=\"${entry}:\$PATH\"" >> "$SHELL_PROFILE"
    ok "Added $entry to PATH in $SHELL_PROFILE"
    ENV_CHANGED=true
  fi
}

# ─── Package manager helper ──────────────────────────────────────────────────
# Usage: install_pkg "display name" "brew_pkg" "apt_pkg" ["dnf_pkg"] ["pacman_pkg"]
install_pkg() {
  local name="$1"
  local brew_pkg="${2:-$1}"
  local apt_pkg="${3:-$1}"
  local dnf_pkg="${4:-$apt_pkg}"      # fallback to apt name
  local pacman_pkg="${5:-$apt_pkg}"    # fallback to apt name

  if [[ "$PLATFORM" == "mac" ]]; then
    if ! command -v brew &>/dev/null; then
      warn "Homebrew not found. Installing Homebrew first..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    info "Installing $name via Homebrew..."
    brew install "$brew_pkg"
  else
    case "$PKG_MGR" in
      apt)
        info "Installing $name via apt..."
        sudo apt-get update -qq
        sudo apt-get install -y "$apt_pkg" ;;
      dnf)
        info "Installing $name via dnf..."
        sudo dnf install -y "$dnf_pkg" ;;
      yum)
        info "Installing $name via yum..."
        sudo yum install -y "$dnf_pkg" ;;
      pacman)
        info "Installing $name via pacman..."
        sudo pacman -S --noconfirm "$pacman_pkg" ;;
      zypper)
        info "Installing $name via zypper..."
        sudo zypper install -y "$dnf_pkg" ;;
      *)
        fail "No supported package manager found. Install $name manually."
        return 1 ;;
    esac
  fi
}

# ─── Ensure prerequisites exist ──────────────────────────────────────────────
ensure_prereqs() {
  for cmd in curl unzip; do
    if ! command -v "$cmd" &>/dev/null; then
      warn "$cmd not found. Installing..."
      install_pkg "$cmd" "$cmd" "$cmd" "$cmd" "$cmd"
    fi
  done
}

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Node.js — pinned version via nvm
# ═══════════════════════════════════════════════════════════════════════════════

# Required Node version (must match .nvmrc)
REQUIRED_NODE_MAJOR=16

echo ""
info "Checking Node.js (requires v${REQUIRED_NODE_MAJOR}.x)..."

# ─── Load nvm if available ────────────────────────────────────────────────────
load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # Source nvm from common locations
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    . "$NVM_DIR/nvm.sh"
    return 0
  fi
  # Homebrew nvm
  local brew_prefix
  brew_prefix="$(brew --prefix 2>/dev/null || echo "")"
  if [[ -n "$brew_prefix" && -s "$brew_prefix/opt/nvm/nvm.sh" ]]; then
    . "$brew_prefix/opt/nvm/nvm.sh"
    return 0
  fi
  return 1
}

# ─── Install nvm if not present ───────────────────────────────────────────────
install_nvm() {
  info "Installing nvm (Node Version Manager)..."
  ensure_prereqs
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  . "$NVM_DIR/nvm.sh"
  ok "nvm installed"
}

# ─── Check if current node version is compatible ─────────────────────────────
check_node_version() {
  if ! command -v node &>/dev/null; then
    return 1
  fi
  local ver
  ver="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [[ "$ver" -ge "$REQUIRED_NODE_MAJOR" && "$ver" -lt 19 ]]; then
    return 0
  fi
  return 1
}

# ─── Main Node.js setup logic ────────────────────────────────────────────────
if check_node_version; then
  ok "Node.js $(node -v) (compatible)"
else
  if command -v node &>/dev/null; then
    warn "Node.js $(node -v) found but not compatible (need v${REQUIRED_NODE_MAJOR}.x - v18.x)"
  else
    warn "Node.js not found."
  fi

  # Try loading nvm
  if ! load_nvm; then
    install_nvm
  fi

  # Install and use the required version
  info "Installing Node.js v${REQUIRED_NODE_MAJOR} via nvm..."
  nvm install "$REQUIRED_NODE_MAJOR"
  nvm use "$REQUIRED_NODE_MAJOR"
  nvm alias default "$REQUIRED_NODE_MAJOR"

  # Persist nvm init in shell profile if not already there
  if ! grep -qF 'NVM_DIR' "$SHELL_PROFILE" 2>/dev/null; then
    {
      echo ""
      echo "# nvm (added by CivicAlerts setup)"
      echo "export NVM_DIR=\"\$HOME/.nvm\""
      echo "[ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\""
    } >> "$SHELL_PROFILE"
    ok "Added nvm init to $SHELL_PROFILE"
    ENV_CHANGED=true
  fi

  ok "Node.js $(node -v) installed via nvm"
fi

info "Checking npm..."
if command -v npm &>/dev/null; then
  ok "npm $(npm -v)"
else
  warn "npm not found. It should come with Node.js — try restarting your terminal."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 2. JDK — scan known paths, install if missing, set JAVA_HOME
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Checking JDK..."

# Validate existing JAVA_HOME first - clear if invalid BEFORE detection
if [[ -n "${JAVA_HOME:-}" && ! -x "$JAVA_HOME/bin/javac" ]]; then
  warn "Existing JAVA_HOME is invalid: $JAVA_HOME"
  info "Clearing stale JAVA_HOME from $SHELL_PROFILE..."
  if [[ "$PLATFORM" == "mac" ]]; then
    sed -i '' '/^export JAVA_HOME=/d' "$SHELL_PROFILE" 2>/dev/null || true
  else
    sed -i '/^export JAVA_HOME=/d' "$SHELL_PROFILE" 2>/dev/null || true
  fi
  unset JAVA_HOME
  ENV_CHANGED=true
fi

detect_java_home() {
  # 1) If javac is on PATH and actually works (macOS has a stub at /usr/bin/javac)
  if command -v javac &>/dev/null; then
    # Verify javac actually runs (macOS /usr/bin/javac is a shim that fails if no JDK installed)
    if javac -version &>/dev/null; then
      local javac_real
      if [[ "$PLATFORM" == "mac" ]]; then
        javac_real="$(command -v javac)"
        # On macOS, follow the symlink chain
        while [[ -L "$javac_real" ]]; do javac_real="$(readlink "$javac_real")"; done
      else
        javac_real="$(readlink -f "$(command -v javac)")"
      fi
      local candidate
      candidate="$(dirname "$(dirname "$javac_real")")"
      # Sanity check: reject /usr or other system dirs that aren't real JDK homes
      if [[ -x "$candidate/bin/javac" ]] && "$candidate/bin/javac" -version &>/dev/null; then
        echo "$candidate"
        return 0
      fi
    fi
  fi

  # 2) macOS: use java_home utility
  if [[ "$PLATFORM" == "mac" ]]; then
    local jh
    jh="$(/usr/libexec/java_home 2>/dev/null || true)"
    if [[ -n "$jh" && -d "$jh" ]]; then echo "$jh"; return 0; fi
  fi

  # 3) Scan known directories
  local candidates=()
  local brew_prefix
  brew_prefix="$(brew --prefix 2>/dev/null || echo "")"
  if [[ "$PLATFORM" == "mac" ]]; then
    candidates=(
      "/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home"
      "/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"
      "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"
      "/Library/Java/JavaVirtualMachines/"*"/Contents/Home"
    )
    if [[ -n "$brew_prefix" ]]; then
      candidates+=(
        "$brew_prefix/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
        "$brew_prefix/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home"
        "$brew_prefix/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
      )
    fi
  else
    candidates=(
      "/usr/lib/jvm/java-17-openjdk-amd64"
      "/usr/lib/jvm/java-17-openjdk-arm64"
      "/usr/lib/jvm/java-17-openjdk"
      "/usr/lib/jvm/java-11-openjdk-amd64"
      "/usr/lib/jvm/java-11-openjdk-arm64"
      "/usr/lib/jvm/java-11-openjdk"
      "/usr/lib/jvm/temurin-17-jdk-amd64"
      "/usr/lib/jvm/temurin-11-jdk-amd64"
      "/usr/lib/jvm/"*"-17"*
      "/usr/lib/jvm/"*"-11"*
      "/usr/lib/jvm/default-java"             # Debian/Ubuntu alternative
      "/usr/lib/jvm/default"                  # Arch
      "/usr/lib/jvm/"*
      "$HOME/.sdkman/candidates/java/current" # SDKMAN
    )
  fi

  for c in "${candidates[@]}"; do
    for resolved in $c; do
      if [[ -d "$resolved" && -x "$resolved/bin/javac" ]]; then
        echo "$resolved"
        return 0
      fi
    done
  done

  echo ""
  return 1
}

DETECTED_JAVA_HOME="$(detect_java_home || true)"

if [[ -n "$DETECTED_JAVA_HOME" ]]; then
  ok "JDK found at: $DETECTED_JAVA_HOME"
  JAVA_VER="$("$DETECTED_JAVA_HOME/bin/javac" -version 2>&1)"
  ok "$JAVA_VER"
else
  warn "JDK not found on system. Installing JDK 17..."
  if [[ "$PLATFORM" == "mac" ]]; then
    if ! command -v brew &>/dev/null; then
      warn "Homebrew not found. Installing Homebrew first..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install openjdk@17
    sudo ln -sfn "$(brew --prefix openjdk@17)/libexec/openjdk.jdk" \
      /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null || true
  else
    case "$PKG_MGR" in
      apt)     sudo apt-get update -qq && sudo apt-get install -y openjdk-17-jdk ;;
      dnf|yum) sudo "$PKG_MGR" install -y java-17-openjdk-devel ;;
      pacman)  sudo pacman -S --noconfirm jdk17-openjdk ;;
      zypper)  sudo zypper install -y java-17-openjdk-devel ;;
      *)       fail "Cannot auto-install JDK. Install JDK 17 manually."; return 1 ;;
    esac
  fi
  DETECTED_JAVA_HOME="$(detect_java_home || true)"
  ok "JDK 17 installed at $DETECTED_JAVA_HOME"
fi

# Set JAVA_HOME persistently right after install
if [[ -n "$DETECTED_JAVA_HOME" ]]; then
  persist_env "JAVA_HOME" "$DETECTED_JAVA_HOME"
  # Verify it works
  if [[ -x "$JAVA_HOME/bin/javac" ]]; then
    VERIFY_VER="$("$JAVA_HOME/bin/javac" -version 2>&1)"
    ok "JAVA_HOME verified: $JAVA_HOME ($VERIFY_VER)"
  else
    fail "JAVA_HOME verification failed. javac not found at $JAVA_HOME/bin/javac"
  fi
else
  fail "JAVA_HOME could not be set. Install JDK 17 manually and set JAVA_HOME."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Android SDK — scan known paths, install if missing, set ANDROID_HOME
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Checking Android SDK..."

# Validate existing ANDROID_HOME first - clear if invalid BEFORE detection
if [[ -n "${ANDROID_HOME:-}" && ! -d "$ANDROID_HOME" ]]; then
  warn "Existing ANDROID_HOME is invalid: $ANDROID_HOME"
  info "Clearing stale ANDROID_HOME from $SHELL_PROFILE..."
  if [[ "$PLATFORM" == "mac" ]]; then
    sed -i '' '/^export ANDROID_HOME=/d' "$SHELL_PROFILE" 2>/dev/null || true
  else
    sed -i '/^export ANDROID_HOME=/d' "$SHELL_PROFILE" 2>/dev/null || true
  fi
  unset ANDROID_HOME
  ENV_CHANGED=true
fi

detect_android_home() {
  # 1) Check env vars
  for var in ANDROID_HOME ANDROID_SDK_ROOT; do
    local val="${!var:-}"
    if [[ -n "$val" && -d "$val" ]]; then echo "$val"; return 0; fi
  done

  # 2) Scan known directories
  local candidates=()
  local brew_prefix
  brew_prefix="$(brew --prefix 2>/dev/null || echo "")"
  if [[ "$PLATFORM" == "mac" ]]; then
    candidates=(
      "$HOME/Library/Android/sdk"
      "$HOME/Android/Sdk"
      "/opt/android-sdk"
      "/usr/local/share/android-sdk"
    )
    [[ -n "$brew_prefix" ]] && candidates+=("$brew_prefix/share/android-sdk")
  else
    candidates=(
      "$HOME/Android/Sdk"
      "/usr/lib/android-sdk"
      "/opt/android-sdk"
      "/opt/android/sdk"
      "$HOME/.android/sdk"
    )
  fi

  for c in "${candidates[@]}"; do
    if [[ -d "$c" ]]; then echo "$c"; return 0; fi
  done

  echo ""
  return 1
}

DETECTED_ANDROID_HOME="$(detect_android_home || true)"

install_android_sdk() {
  local SDK_DIR
  if [[ "$PLATFORM" == "mac" ]]; then
    SDK_DIR="$HOME/Library/Android/sdk"
  else
    SDK_DIR="$HOME/Android/Sdk"
  fi
  mkdir -p "$SDK_DIR/cmdline-tools"

  local TOOLS_URL
  if [[ "$PLATFORM" == "mac" ]]; then
    TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip"
  else
    TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
  fi

  local TMP_ZIP
  TMP_ZIP="$(mktemp /tmp/android-cmdline-tools-XXXXXX.zip)"
  # Ensure curl and unzip are available
  ensure_prereqs

  info "Downloading Android command-line tools (~150 MB)..."
  info "  URL: $TOOLS_URL"
  info "  Destination: $TMP_ZIP"
  info "  Connecting to dl.google.com..."
  local HTTP_CODE
  HTTP_CODE=$(curl -sL -o /dev/null -w "%{http_code}" --connect-timeout 15 "$TOOLS_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "000" ]]; then
    fail "Cannot reach dl.google.com — check your internet connection or firewall."
    return 1
  elif [[ "$HTTP_CODE" != "200" ]]; then
    fail "Server returned HTTP $HTTP_CODE — URL may be invalid."
    return 1
  fi
  info "  Connected (HTTP $HTTP_CODE). Starting download..."

  curl --progress-bar --retry 3 --retry-delay 5 --connect-timeout 30 --max-time 600 \
    -fSL "$TOOLS_URL" -o "$TMP_ZIP"
  local CURL_EXIT=$?
  if [[ $CURL_EXIT -ne 0 ]]; then
    fail "curl exited with code $CURL_EXIT. Network issue or server unreachable."
    rm -f "$TMP_ZIP" 2>/dev/null
    return 1
  fi

  if [[ ! -s "$TMP_ZIP" ]]; then
    fail "Download file is empty or missing."
    return 1
  fi

  local ZIP_SIZE
  ZIP_SIZE=$(stat -f%z "$TMP_ZIP" 2>/dev/null || stat -c%s "$TMP_ZIP" 2>/dev/null || echo "0")
  local ZIP_MB
  ZIP_MB=$(awk "BEGIN {printf \"%.1f\", $ZIP_SIZE / 1048576}")
  if [[ "$ZIP_SIZE" -lt 1000000 ]]; then
    fail "Download too small (${ZIP_MB} MB) — likely incomplete or corrupted."
    rm -f "$TMP_ZIP"
    return 1
  fi
  ok "Download complete (${ZIP_MB} MB)"

  info "Extracting to $SDK_DIR/cmdline-tools..."
  if ! unzip -qo "$TMP_ZIP" -d "$SDK_DIR/cmdline-tools"; then
    fail "Extraction failed — zip may be corrupted."
    rm -f "$TMP_ZIP"
    return 1
  fi
  if [[ -d "$SDK_DIR/cmdline-tools/cmdline-tools" ]]; then
    rm -rf "$SDK_DIR/cmdline-tools/latest" 2>/dev/null || true
    mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
  fi
  rm -f "$TMP_ZIP"
  ok "Extraction complete"

  if [[ ! -f "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]]; then
    fail "sdkmanager not found after extraction — zip may be corrupted."
    return 1
  fi

  export ANDROID_HOME="$SDK_DIR"
  export PATH="$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

  info "Accepting licenses & installing platform-tools + SDK 31..."
  if ! (yes | sdkmanager --licenses 2>/dev/null); then
    warn "License acceptance had issues — continuing anyway"
  fi
  if ! sdkmanager "platform-tools" "platforms;android-31" "build-tools;30.0.3"; then
    fail "sdkmanager install failed. Check Java installation and network."
    return 1
  fi

  DETECTED_ANDROID_HOME="$SDK_DIR"
  ok "Android SDK installed at $SDK_DIR"
}

if [[ -n "$DETECTED_ANDROID_HOME" ]]; then
  ok "Android SDK found at: $DETECTED_ANDROID_HOME"
else
  warn "Android SDK not found on system."
  install_android_sdk
fi

# Validate existing ANDROID_HOME - clear it if it points to a bad path
if [[ -n "${ANDROID_HOME:-}" && ! -d "$ANDROID_HOME" ]]; then
  warn "Existing ANDROID_HOME is invalid: $ANDROID_HOME"
  info "Clearing stale ANDROID_HOME from $SHELL_PROFILE..."
  if [[ "$PLATFORM" == "mac" ]]; then
    sed -i '' '/^export ANDROID_HOME=/d' "$SHELL_PROFILE" 2>/dev/null || true
  else
    sed -i '/^export ANDROID_HOME=/d' "$SHELL_PROFILE" 2>/dev/null || true
  fi
  unset ANDROID_HOME
  ENV_CHANGED=true
fi

# Set ANDROID_HOME persistently right after install
if [[ -n "$DETECTED_ANDROID_HOME" ]]; then
  persist_env "ANDROID_HOME" "$DETECTED_ANDROID_HOME"

  persist_path_entry "$DETECTED_ANDROID_HOME/platform-tools"
  [[ -d "$DETECTED_ANDROID_HOME/cmdline-tools/latest/bin" ]] && \
    persist_path_entry "$DETECTED_ANDROID_HOME/cmdline-tools/latest/bin"

  if [[ -d "$ANDROID_HOME" ]]; then
    ok "ANDROID_HOME verified: $ANDROID_HOME"
  else
    fail "ANDROID_HOME verification failed. Directory not found: $ANDROID_HOME"
  fi
else
  fail "ANDROID_HOME could not be set. Install Android SDK manually."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 4. adb
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Checking adb..."
ADB_PATH="${DETECTED_ANDROID_HOME:-}/platform-tools/adb"
if command -v adb &>/dev/null; then
  ok "adb: $(command -v adb)"
elif [[ -x "$ADB_PATH" ]]; then
  persist_path_entry "${DETECTED_ANDROID_HOME}/platform-tools"
  ok "adb: $ADB_PATH"
else
  warn "adb not found. Installing platform-tools..."
  if [[ -n "${DETECTED_ANDROID_HOME:-}" && -x "$DETECTED_ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]]; then
    if "$DETECTED_ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platform-tools"; then
      persist_path_entry "$DETECTED_ANDROID_HOME/platform-tools"
      ok "adb installed via sdkmanager"
    else
      fail "sdkmanager platform-tools failed."
    fi
  else
    warn "Android SDK not available either. Installing full Android SDK first..."
    install_android_sdk
    if [[ -n "${DETECTED_ANDROID_HOME:-}" && -x "$DETECTED_ANDROID_HOME/platform-tools/adb" ]]; then
      persist_env "ANDROID_HOME" "$DETECTED_ANDROID_HOME"
      persist_path_entry "$DETECTED_ANDROID_HOME/platform-tools"
      ok "Android SDK + adb installed at $DETECTED_ANDROID_HOME"
    else
      fail "Could not install Android SDK. Install Android Studio manually from https://developer.android.com/studio"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 4b. Connected devices check
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Checking for connected Android devices..."

ADB_CMD=""
if command -v adb &>/dev/null; then
  ADB_CMD="adb"
elif [[ -x "${DETECTED_ANDROID_HOME:-}/platform-tools/adb" ]]; then
  ADB_CMD="${DETECTED_ANDROID_HOME}/platform-tools/adb"
fi

if [[ -n "$ADB_CMD" ]]; then
  DEVICES_OUTPUT="$($ADB_CMD devices 2>&1)"
  CONNECTED=$(echo "$DEVICES_OUTPUT" | grep -cE '^[^\s]+\s+(device|unauthorized|offline)$' || true)
  UNAUTHORIZED=$(echo "$DEVICES_OUTPUT" | grep -c 'unauthorized' || true)

  if [[ "$CONNECTED" -eq 0 ]]; then
    warn "No Android devices detected."
    info "  To connect your physical Android device via USB:"
    info "    1. Enable Developer Options: Settings > About Phone > tap 'Build Number' 7 times"
    info "    2. Enable USB Debugging: Settings > Developer Options > USB Debugging"
    info "    3. Connect phone via USB cable (make sure it supports data transfer, not charge-only)"
    info "    4. When prompted on phone, tap 'Allow USB Debugging' (check 'Always allow')"
    info "    5. Run: adb devices"
    info ""
    info "  If your device still doesn't appear:"
    info "    - Try a different USB cable or port"
    info "    - Revoke USB debugging authorizations on phone, then re-allow"
    info "    - Run: adb kill-server && adb devices"
  elif [[ "$UNAUTHORIZED" -gt 0 ]]; then
    warn "Device connected but not authorized."
    info "  Check your phone - tap 'Allow USB Debugging' on the popup."
    info "  If no popup appears:"
    info "    1. Go to Settings > Developer Options > Revoke USB Debugging Authorizations"
    info "    2. Unplug and replug the USB cable"
    info "    3. Run: adb kill-server && adb devices"
  else
    while IFS= read -r line; do
      DEV_ID=$(echo "$line" | awk '{print $1}')
      MODEL=$($ADB_CMD -s "$DEV_ID" shell getprop ro.product.model 2>/dev/null || true)
      if [[ -n "$MODEL" ]]; then
        ok "Device connected: $MODEL ($DEV_ID)"
      else
        ok "Device connected: $DEV_ID"
      fi
    done <<< "$(echo "$DEVICES_OUTPUT" | grep -E '^[^\s]+\s+device$')"
    # Set up port forwarding so Metro bundler can reach the device
    info "Setting up adb reverse port forwarding for Metro..."
    if $ADB_CMD reverse tcp:8081 tcp:8081 &>/dev/null; then
      ok "adb reverse tcp:8081 tcp:8081 (Metro bundler will connect to device)"
    else
      warn "adb reverse failed — you may need to run it manually: adb reverse tcp:8081 tcp:8081"
    fi
  fi
else
  warn "adb not available - cannot check for connected devices."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 5. React Native CLI
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Checking React Native CLI..."
if npx react-native --version &>/dev/null; then
  ok "react-native CLI available (via npx)"
else
  warn "react-native CLI not accessible. Will be available after npm install."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 5b. Generate android/local.properties
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Generating android/local.properties..."
SCRIPT_DIR_LP="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR_LP="$(dirname "$SCRIPT_DIR_LP")"
LOCAL_PROPS="$PROJECT_DIR_LP/android/local.properties"

{
  echo "# Generated by CivicAlerts setup script — do not commit"
  [[ -n "${ANDROID_HOME:-}" ]] && echo "sdk.dir=${ANDROID_HOME}"
  [[ -n "${JAVA_HOME:-}" ]] && echo "org.gradle.java.home=${JAVA_HOME}"
} > "$LOCAL_PROPS"
ok "Wrote $LOCAL_PROPS"

# ═══════════════════════════════════════════════════════════════════════════════
# 6. npm install
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
  info "Installing npm dependencies..."
  cd "$PROJECT_DIR" && npm install
  ok "Dependencies installed"
else
  ok "node_modules already exists. Run 'npm install' to update."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  JAVA_HOME     = ${CYAN}${JAVA_HOME:-<not set>}${NC}"
echo -e "  ANDROID_HOME  = ${CYAN}${ANDROID_HOME:-<not set>}${NC}"
echo ""

if [[ "$ENV_CHANGED" == "true" ]]; then
  warn "Environment variables were written to $SHELL_PROFILE"
  warn "Run this to apply now:  ${CYAN}source $SHELL_PROFILE${NC}"
  echo ""
fi

echo -e "  ${CYAN}npm start${NC}       → Start Metro bundler"
echo -e "  ${CYAN}npm run android${NC} → Run on Android"
echo -e "  ${CYAN}npm run ios${NC}     → Run on iOS"
echo ""
