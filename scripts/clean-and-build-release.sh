#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Clean & Build Release Script for AlertX (Android)
# ──────────────────────────────────────────────

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ERROR_LOG="$PROJECT_ROOT/build-error-${TIMESTAMP}.log"
APK_OUTPUT="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"

log() {
  echo ""
  echo "========================================"
  echo "  $1"
  echo "========================================"
  echo ""
}

cleanup_on_error() {
  echo ""
  echo "========================================"
  echo "  BUILD FAILED"
  echo "  Error log saved to: $ERROR_LOG"
  echo "========================================"
  exit 1
}

cd "$PROJECT_ROOT"

# ── Step 1: Clean watchman cache ──
log "Clearing Watchman cache"
if command -v watchman &>/dev/null; then
  watchman watch-del-all 2>&1 | tee -a "$ERROR_LOG" || true
else
  echo "watchman not found, skipping..."
fi

# ── Step 2: Remove node_modules & reinstall ──
log "Removing node_modules"
rm -rf node_modules
echo "Installing dependencies..."
if ! npm install 2>&1 | tee -a "$ERROR_LOG"; then
  echo "npm install failed!" | tee -a "$ERROR_LOG"
  cleanup_on_error
fi

# ── Step 3: Clear Metro bundler cache ──
log "Clearing Metro / React Native cache"
rm -rf "$TMPDIR/react-"* 2>/dev/null || true
rm -rf "$TMPDIR/metro-"* 2>/dev/null || true
rm -rf "$TMPDIR/haste-map-"* 2>/dev/null || true

# ── Step 4: Clean Android build artifacts ──
log "Cleaning Android build"
cd android
if ! ./gradlew clean 2>&1 | tee -a "$ERROR_LOG"; then
  echo "Gradle clean failed!" | tee -a "$ERROR_LOG"
  cleanup_on_error
fi

rm -rf .gradle build app/build
cd "$PROJECT_ROOT"

# ── Step 5: Clear Gradle global caches (optional but thorough) ──
log "Clearing Gradle caches"
rm -rf ~/.gradle/caches/transforms-* 2>/dev/null || true
rm -rf ~/.gradle/caches/build-cache-* 2>/dev/null || true

# ── Step 6: Build Release APK ──
log "Building Release APK"
cd android
if ! ./gradlew assembleRelease 2>&1 | tee -a "$ERROR_LOG"; then
  echo "Release build failed!" | tee -a "$ERROR_LOG"
  cleanup_on_error
fi
cd "$PROJECT_ROOT"

# ── Done ──
# Remove the error log if build succeeded (it only has stdout)
rm -f "$ERROR_LOG"

log "BUILD SUCCESSFUL"
echo "APK location: $APK_OUTPUT"
echo ""
