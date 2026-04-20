# CivicAlerts

A React Native app for real-time community incident reporting and notifications. Users can report accidents, outages, construction, and hazards near them, and receive alerts about nearby incidents.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 16.x - 18.x | Managed via nvm / nvm-windows |
| npm | 8+ | Comes with Node |
| JDK | 17 | OpenJDK, Temurin, or Zulu |
| Android SDK | API 31 | Build-tools 30.0.3 |
| Xcode | 13+ | macOS only, for iOS builds |

## Quick Start (Automated Setup)

The setup script installs all prerequisites (Node, JDK, Android SDK) automatically.

```bash
# Auto-detects your OS and runs the right script
npm run setup
```

Or run the platform script directly:

```bash
# macOS / Linux
bash scripts/setup.sh

# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
```

After setup completes, restart your terminal so environment variables take effect.

## Manual Installation

```bash
git clone <repository-url>
cd public-alerts
npm install
```

## Running the App

### Start Metro Bundler (required first)

```bash
npm start
```

If you get cache issues:

```bash
npm run start:reset
```

### Run on Android (Physical Device via USB)

1. **Enable Developer Options** on your phone:
   - Go to **Settings > About Phone** and tap **Build Number** 7 times
2. **Enable USB Debugging**:
   - Go to **Settings > Developer Options > USB Debugging** and turn it on
3. **Connect your phone** via USB cable
4. When prompted on the phone, tap **Allow USB Debugging** (check "Always allow")
5. Verify the device is detected:
   ```bash
   adb devices
   ```
   You should see your device listed as `device` (not `unauthorized`).
6. Run the app:
   ```bash
   npm run android
   ```

> **Tip:** If Metro bundler can't connect to your device, run `adb reverse tcp:8081 tcp:8081` to forward the port.

### Run on iOS (macOS only)

```bash
npm run ios
```

## Building a Debug APK

To generate an APK you can share or sideload:

```bash
# Windows
npm run android:build

# macOS / Linux
npm run android:build:unix
```

The APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

To install it on a connected device:

```bash
npm run android:install
```

## All Available Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Install all prerequisites (Node, JDK, Android SDK) |
| `npm start` | Start Metro bundler |
| `npm run start:reset` | Start Metro with cleared cache |
| `npm run android` | Build, install, and launch on Android device |
| `npm run android:usb` | Set up adb port forwarding + run on USB device |
| `npm run android:build` | Build debug APK (Windows) |
| `npm run android:build:unix` | Build debug APK (macOS/Linux) |
| `npm run android:install` | Install debug APK via adb |
| `npm run ios` | Build and run on iOS simulator |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |

## Troubleshooting

### `NODE_OPTIONS is not recognized` (Windows)
This is handled by `cross-env`. Run `npm install` to ensure it's installed.

### `cannot find module tools/gracefulifyFs`
Delete `node_modules` and reinstall:
```bash
# Windows
rd /s /q node_modules
npm install

# macOS / Linux
rm -rf node_modules
npm install
```

### `SDK build-tools not found`
Run `npm run setup` or install manually:
```bash
sdkmanager "platform-tools" "platforms;android-31" "build-tools;30.0.3"
```

### Metro stuck or stale cache
```bash
npm run start:reset
```

### `JAVA_HOME` is set to an invalid directory
If you see errors about `JAVA_HOME`, run `npm run setup` — it auto-detects and fixes stale `JAVA_HOME` values. Or manually fix:
```bash
# macOS — find your installed JDK:
/usr/libexec/java_home -V
export JAVA_HOME=$(/usr/libexec/java_home)

# Windows (PowerShell):
# Check where JDK is installed, then:
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Microsoft\jdk-17", "User")
```

### Device not detected by `adb devices`
1. Make sure USB Debugging is enabled (see [Run on Android](#run-on-android-physical-device-via-usb))
2. Try a different USB cable (some cables are charge-only)
3. On the phone, revoke USB debugging authorizations and re-allow:
   - **Settings > Developer Options > Revoke USB Debugging Authorizations**
4. Restart adb: `adb kill-server && adb devices`

## Project Structure

```
src/
  App.tsx                        # App entry point
  screens/HomeScreen.tsx         # Main screen with map, filters, reports
  components/
    Button.tsx                   # Reusable button
    FilterPanel.tsx              # Incident type/radius filters
    MapView.tsx                  # Map display (mocked)
    NotificationsPanel.tsx       # Notification list
    ReportModal.tsx              # New incident report form
  hooks/useIncidents.ts          # Incident data hooks
  services/mockData.ts           # Mock backend with CRUD & notifications
  navigation/RootNavigator.tsx   # Tab navigation setup
  types/index.ts                 # TypeScript interfaces
  utils/geo.ts                   # Geolocation utilities (Haversine, bounding box)
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design details.
