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
  Darwin) PLATFORM="mac" ;;
  Linux)  PLATFORM="linux" ;;
  *)      fail "Unsupported OS: $OS (use setup.ps1 for Windows)"; exit 1 ;;
esac
info "Detected platform: $PLATFORM"

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
install_pkg() {
  local name="$1"
  local brew_pkg="${2:-$1}"
  local apt_pkg="${3:-$1}"

  if [[ "$PLATFORM" == "mac" ]]; then
    if ! command -v brew &>/dev/null; then
      warn "Homebrew not found. Installing Homebrew first..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    info "Installing $name via Homebrew..."
    brew install "$brew_pkg"
  else
    info "Installing $name via apt..."
    sudo apt-get update -qq
    sudo apt-get install -y "$apt_pkg"
  fi
}

# ─── Scan filesystem for a directory matching a pattern ───────────────────────
# Usage: scan_paths "description" path1 path2 ...
# Returns the first existing path, or empty string
scan_paths() {
  local desc="$1"; shift
  for candidate in "$@"; do
    # Expand globs
    for resolved in $candidate; do
      if [[ -d "$resolved" ]]; then
        info "Found $desc at: $resolved"
        echo "$resolved"
        return 0
      fi
    done
  done
  echo ""
  return 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Node.js
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Checking Node.js..."
if command -v node &>/dev/null; then
  ok "Node.js $(node -v)"
else
  warn "Node.js not found."
  install_pkg "Node.js" "node" "nodejs"
fi

info "Checking npm..."
if command -v npm &>/dev/null; then
  ok "npm $(npm -v)"
else
  warn "npm not found."
  install_pkg "npm" "node" "npm"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 2. JDK — scan known paths, install if missing, set JAVA_HOME
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Checking JDK..."

detect_java_home() {
  # 1) If javac is on PATH, derive from it
  if command -v javac &>/dev/null; then
    local javac_real
    if [[ "$PLATFORM" == "mac" ]]; then
      javac_real="$(command -v javac)"
      # On macOS, follow the symlink chain
      while [[ -L "$javac_real" ]]; do javac_real="$(readlink "$javac_real")"; done
    else
      javac_real="$(readlink -f "$(command -v javac)")"
    fi
    # javac is in <JAVA_HOME>/bin/javac
    echo "$(dirname "$(dirname "$javac_real")")"
    return 0
  fi

  # 2) macOS: use java_home utility
  if [[ "$PLATFORM" == "mac" ]]; then
    local jh
    jh="$(/usr/libexec/java_home 2>/dev/null || true)"
    if [[ -n "$jh" && -d "$jh" ]]; then echo "$jh"; return 0; fi
  fi

  # 3) Scan known directories
  local candidates=()
  if [[ "$PLATFORM" == "mac" ]]; then
    candidates=(
      "/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home"
      "/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home"
      "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"
      "/Library/Java/JavaVirtualMachines/"*"/Contents/Home"
      "$(brew --prefix 2>/dev/null)/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
      "$(brew --prefix 2>/dev/null)/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
    )
  else
    candidates=(
      "/usr/lib/jvm/java-17-openjdk-amd64"
      "/usr/lib/jvm/java-17-openjdk-arm64"
      "/usr/lib/jvm/java-17-openjdk"
      "/usr/lib/jvm/temurin-17-jdk-amd64"
      "/usr/lib/jvm/"*"-17"*
      "/usr/lib/jvm/default-java"
      "/usr/lib/jvm/"*
      "$HOME/.sdkman/candidates/java/current"
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
    sudo apt-get update -qq
    sudo apt-get install -y openjdk-17-jdk
  fi
  DETECTED_JAVA_HOME="$(detect_java_home || true)"
  ok "JDK 17 installed at $DETECTED_JAVA_HOME"
fi

# Set JAVA_HOME persistently
if [[ -n "$DETECTED_JAVA_HOME" ]]; then
  if [[ "${JAVA_HOME:-}" != "$DETECTED_JAVA_HOME" ]]; then
    persist_env "JAVA_HOME" "$DETECTED_JAVA_HOME"
  else
    ok "JAVA_HOME already set: $JAVA_HOME"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Android SDK — scan known paths, install if missing, set ANDROID_HOME
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
info "Checking Android SDK..."

detect_android_home() {
  # 1) Check env vars
  for var in ANDROID_HOME ANDROID_SDK_ROOT; do
    local val="${!var:-}"
    if [[ -n "$val" && -d "$val" ]]; then echo "$val"; return 0; fi
  done

  # 2) Scan known directories
  local candidates=()
  if [[ "$PLATFORM" == "mac" ]]; then
    candidates=(
      "$HOME/Library/Android/sdk"
      "$HOME/Android/Sdk"
      "/opt/android-sdk"
      "/usr/local/share/android-sdk"
      "$(brew --prefix 2>/dev/null)/share/android-sdk"
    )
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
  info "Downloading Android command-line tools..."
  curl -fSL "$TOOLS_URL" -o "$TMP_ZIP"

  info "Extracting..."
  unzip -qo "$TMP_ZIP" -d "$SDK_DIR/cmdline-tools"
  if [[ -d "$SDK_DIR/cmdline-tools/cmdline-tools" ]]; then
    rm -rf "$SDK_DIR/cmdline-tools/latest" 2>/dev/null || true
    mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
  fi
  rm -f "$TMP_ZIP"

  export ANDROID_HOME="$SDK_DIR"
  export PATH="$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

  info "Accepting licenses & installing platform-tools + SDK 31..."
  yes | sdkmanager --licenses 2>/dev/null || true
  sdkmanager "platform-tools" "platforms;android-31" "build-tools;31.0.0"

  DETECTED_ANDROID_HOME="$SDK_DIR"
  ok "Android SDK installed at $SDK_DIR"
}

if [[ -n "$DETECTED_ANDROID_HOME" ]]; then
  ok "Android SDK found at: $DETECTED_ANDROID_HOME"
else
  warn "Android SDK not found on system."
  install_android_sdk
fi

# Set ANDROID_HOME persistently
if [[ -n "$DETECTED_ANDROID_HOME" ]]; then
  if [[ "${ANDROID_HOME:-}" != "$DETECTED_ANDROID_HOME" ]]; then
    persist_env "ANDROID_HOME" "$DETECTED_ANDROID_HOME"
  else
    ok "ANDROID_HOME already set: $ANDROID_HOME"
  fi

  # Ensure platform-tools and cmdline-tools are on PATH
  persist_path_entry "$DETECTED_ANDROID_HOME/platform-tools"
  [[ -d "$DETECTED_ANDROID_HOME/cmdline-tools/latest/bin" ]] && \
    persist_path_entry "$DETECTED_ANDROID_HOME/cmdline-tools/latest/bin"
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
  ok "adb: $ADB_PATH"
else
  warn "adb not found. Installing platform-tools..."
  if [[ -n "${DETECTED_ANDROID_HOME:-}" && -x "$DETECTED_ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]]; then
    "$DETECTED_ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platform-tools"
    ok "adb installed via sdkmanager"
  else
    install_pkg "android-platform-tools" "android-platform-tools" "android-tools-adb"
  fi
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
