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
  *)      fail "Unsupported OS: $OS"; exit 1 ;;
esac
info "Detected platform: $PLATFORM"

# ─── Package manager helper ───────────────────────────────────────────────────
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

# ─── 1. Node.js ──────────────────────────────────────────────────────────────
echo ""
info "Checking Node.js..."
if command -v node &>/dev/null; then
  NODE_VER="$(node -v)"
  ok "Node.js $NODE_VER"
else
  warn "Node.js not found."
  install_pkg "Node.js" "node" "nodejs"
fi

# ─── 2. npm ───────────────────────────────────────────────────────────────────
info "Checking npm..."
if command -v npm &>/dev/null; then
  ok "npm $(npm -v)"
else
  warn "npm not found."
  install_pkg "npm" "node" "npm"
fi

# ─── 3. JDK (Java) ───────────────────────────────────────────────────────────
echo ""
info "Checking JDK..."
if command -v javac &>/dev/null; then
  JAVA_VER="$(javac -version 2>&1)"
  ok "$JAVA_VER"
else
  warn "JDK not found. Installing JDK 17..."
  if [[ "$PLATFORM" == "mac" ]]; then
    brew install openjdk@17
    # Symlink so system Java wrappers find it
    sudo ln -sfn "$(brew --prefix openjdk@17)/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null || true
  else
    sudo apt-get update -qq
    sudo apt-get install -y openjdk-17-jdk
  fi
  ok "JDK 17 installed"
fi

# Ensure JAVA_HOME is set
if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ "$PLATFORM" == "mac" ]]; then
    DETECTED_JAVA_HOME="$(/usr/libexec/java_home 2>/dev/null || true)"
  else
    DETECTED_JAVA_HOME="$(dirname "$(dirname "$(readlink -f "$(which javac)")")")"
  fi

  if [[ -n "$DETECTED_JAVA_HOME" ]]; then
    warn "JAVA_HOME not set. Add this to your shell profile:"
    echo -e "  ${CYAN}export JAVA_HOME=\"$DETECTED_JAVA_HOME\"${NC}"
  fi
else
  ok "JAVA_HOME=$JAVA_HOME"
fi

# ─── 4. Android SDK & adb ────────────────────────────────────────────────────
echo ""
info "Checking Android SDK..."

# Try to locate ANDROID_HOME / ANDROID_SDK_ROOT
ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$ANDROID_HOME" ]]; then
  # Common default locations
  if [[ "$PLATFORM" == "mac" ]]; then
    for candidate in "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
      [[ -d "$candidate" ]] && ANDROID_HOME="$candidate" && break
    done
  else
    for candidate in "$HOME/Android/Sdk" "/usr/lib/android-sdk"; do
      [[ -d "$candidate" ]] && ANDROID_HOME="$candidate" && break
    done
  fi
fi

install_android_sdk() {
  info "Installing Android command-line tools..."

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
  # Google nests them under cmdline-tools/; move to cmdline-tools/latest
  if [[ -d "$SDK_DIR/cmdline-tools/cmdline-tools" ]]; then
    mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
  fi
  rm -f "$TMP_ZIP"

  ANDROID_HOME="$SDK_DIR"
  export ANDROID_HOME
  export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

  info "Accepting licenses & installing platform-tools + SDK 31..."
  yes | sdkmanager --licenses 2>/dev/null || true
  sdkmanager "platform-tools" "platforms;android-31" "build-tools;31.0.0"

  ok "Android SDK installed at $ANDROID_HOME"
}

if [[ -n "$ANDROID_HOME" && -d "$ANDROID_HOME" ]]; then
  ok "Android SDK found at $ANDROID_HOME"
else
  warn "Android SDK not found."
  install_android_sdk
fi

# ─── 5. adb ──────────────────────────────────────────────────────────────────
echo ""
info "Checking adb..."
ADB_PATH="${ANDROID_HOME:-}/platform-tools/adb"
if command -v adb &>/dev/null; then
  ok "adb found: $(command -v adb)"
elif [[ -x "$ADB_PATH" ]]; then
  ok "adb found: $ADB_PATH"
  warn "adb is not on PATH. Add this to your shell profile:"
  echo -e "  ${CYAN}export PATH=\"\$ANDROID_HOME/platform-tools:\$PATH\"${NC}"
else
  warn "adb not found. Installing platform-tools..."
  if [[ -n "${ANDROID_HOME:-}" ]]; then
    "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platform-tools"
  else
    install_pkg "android-platform-tools" "android-platform-tools" "android-tools-adb"
  fi
  ok "adb installed"
fi

# ─── 6. React Native CLI ─────────────────────────────────────────────────────
echo ""
info "Checking React Native CLI..."
if npx react-native --version &>/dev/null; then
  ok "react-native CLI available (via npx)"
else
  warn "react-native CLI not accessible. Will be available after npm install."
fi

# ─── 7. npm install ──────────────────────────────────────────────────────────
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

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

MISSING_ENV=()
[[ -z "${JAVA_HOME:-}" ]] && MISSING_ENV+=("JAVA_HOME")
[[ -z "${ANDROID_HOME:-}" ]] && MISSING_ENV+=("ANDROID_HOME")

if [[ ${#MISSING_ENV[@]} -gt 0 ]]; then
  SHELL_PROFILE="~/.bashrc"
  [[ "$SHELL" == *zsh* ]] && SHELL_PROFILE="~/.zshrc"
  warn "Add these to your shell profile ($SHELL_PROFILE):"
  echo ""
  if [[ -z "${JAVA_HOME:-}" ]]; then
    if [[ "$PLATFORM" == "mac" ]]; then
      echo -e "  export JAVA_HOME=\"$(/usr/libexec/java_home 2>/dev/null || echo '/path/to/jdk')\""
    else
      DETECTED="$(dirname "$(dirname "$(readlink -f "$(which javac 2>/dev/null || echo /usr/lib/jvm/java-17-openjdk-amd64/bin/javac)")")")"
      echo -e "  export JAVA_HOME=\"$DETECTED\""
    fi
  fi
  if [[ -n "${ANDROID_HOME:-}" ]]; then
    echo -e "  export ANDROID_HOME=\"$ANDROID_HOME\""
  else
    if [[ "$PLATFORM" == "mac" ]]; then
      echo -e "  export ANDROID_HOME=\"\$HOME/Library/Android/sdk\""
    else
      echo -e "  export ANDROID_HOME=\"\$HOME/Android/Sdk\""
    fi
  fi
  echo -e "  export PATH=\"\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH\""
  echo ""
fi

echo -e "  ${CYAN}npm start${NC}       → Start Metro bundler"
echo -e "  ${CYAN}npm run android${NC} → Run on Android"
echo -e "  ${CYAN}npm run ios${NC}     → Run on iOS"
echo ""
