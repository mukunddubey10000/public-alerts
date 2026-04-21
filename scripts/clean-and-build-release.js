#!/usr/bin/env node

/**
 * Cross-platform Clean & Build Release Script for AlertX (Android)
 * Works on macOS, Linux, and Windows.
 * Uses only Node.js builtins.
 */

var childProcess = require("child_process");
var fs = require("fs");
var os = require("os");
var path = require("path");

var PROJECT_ROOT = path.resolve(__dirname, "..");
var LOG_DIR = path.join(PROJECT_ROOT, "build-logs"); // Log folder

var TIMESTAMP = new Date()
  .toISOString()
  .replace(/[:\-T.]/g, "")
  .slice(0, 14);
var ERROR_LOG = path.join(LOG_DIR, "build-error-" + TIMESTAMP + ".txt");

var IS_WIN = process.platform === "win32";
var GRADLEW = IS_WIN ? "gradlew.bat" : "./gradlew";
var APK_OUTPUT = path.join(
  PROJECT_ROOT,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);

// Ensure the log directory exists with read/write/execute for everyone
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o777 });
}

function appendLog(text) {
  try {
    fs.appendFileSync(ERROR_LOG, text, { mode: 0o666 });
  } catch (_) {
    console.error("Warning: could not write to log file: " + ERROR_LOG);
  }
}

function log(msg) {
  console.log("");
  console.log("========================================");
  console.log("  " + msg);
  console.log("========================================");
  console.log("");
}

function run(cmd, cwd) {
  console.log("> " + cmd);
  try {
    childProcess.execSync(cmd, {
      cwd: cwd || PROJECT_ROOT,
      stdio: "inherit",
      env: Object.assign({}, process.env),
    });
  } catch (err) {
    // Log the command and error details to the error log
    appendLog("COMMAND: " + cmd + "\n");
    appendLog("EXIT CODE: " + (err.status != null ? err.status : "unknown") + "\n");
    if (err.stdout) appendLog("STDOUT:\n" + err.stdout.toString() + "\n");
    if (err.stderr) appendLog("STDERR:\n" + err.stderr.toString() + "\n");
    appendLog("ERROR: " + (err.message || String(err)) + "\n");
    appendLog("========================================\n\n");

    throw err;
  }
}

function tryRun(cmd, cwd) {
  try {
    run(cmd, cwd);
  } catch (_) {
    /* non-fatal */
  }
}

function rimraf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function rimrafGlob(dir, prefix) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function (entry) {
    if (entry.startsWith(prefix)) {
      rimraf(path.join(dir, entry));
    }
  });
}

// ──────────────────────────────────────────

try {
  // Step 1: Remove node_modules & reinstall
  log("Removing node_modules & reinstalling");
  rimraf(path.join(PROJECT_ROOT, "node_modules"));
  run("npm install --legacy-peer-deps");

  // Step 3: Clear Metro / React Native temp caches
  log("Clearing Metro / React Native cache");
  var tmpDir = os.tmpdir();
  ["react-", "metro-", "haste-map-"].forEach(function (prefix) {
    rimrafGlob(tmpDir, prefix);
  });

  // Step 4: Stop Gradle daemon & clean Android build artifacts
  log("Cleaning Android build");
  var androidDir = path.join(PROJECT_ROOT, "android");
  tryRun(GRADLEW + " --stop", androidDir);
  run(GRADLEW + " clean", androidDir);
  rimraf(path.join(androidDir, ".gradle"));
  rimraf(path.join(androidDir, "build"));
  rimraf(path.join(androidDir, "app", "build"));

  // Step 5: Build Release APK
  log("Building Release APK");
  run(GRADLEW + " assembleRelease", androidDir);

  // Success — remove log file (it's empty on success)
  rimraf(ERROR_LOG);

  log("BUILD SUCCESSFUL");
  console.log("APK location: " + APK_OUTPUT);
  console.log("");
} catch (err) {
  // Ensure error details are written to log even if run() didn't log them
  appendLog("FATAL: " + (err.message || String(err)) + "\n");
  if (err.stack) appendLog(err.stack + "\n");

  console.log("");
  console.log("========================================");
  console.log("  BUILD FAILED");
  console.log("  Error log saved to: " + ERROR_LOG);
  console.log("========================================");

  process.exit(1);
}
