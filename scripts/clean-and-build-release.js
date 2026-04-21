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
  .replace(/[:\-T]/g, "")
  .slice(0, 15);
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

// Open log file with read/write permissions for all users
var logStream = fs.createWriteStream(ERROR_LOG, { flags: "a", mode: 0o666 });

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
      stdio: ["inherit", "pipe", "pipe"],
      env: Object.assign({}, process.env),
    });
  } catch (err) {
    var output = "";
    if (err.stdout) output += err.stdout.toString();
    if (err.stderr) output += err.stderr.toString();

    // Log the command and output to the error log
    logStream.write("COMMAND: " + cmd + "\n");
    logStream.write("ERROR MESSAGE:\n" + output + "\n");
    logStream.write("========================================\n\n");

    console.error(output);
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
  // Step 1: Clear Watchman cache
  log("Clearing Watchman cache");
  tryRun("watchman watch-del-all");

  // Step 2: Remove node_modules & reinstall
  log("Removing node_modules & reinstalling");
  rimraf(path.join(PROJECT_ROOT, "node_modules"));
  run("npm install --legacy-peer-deps");

  // Step 3: Clear Metro / React Native temp caches
  log("Clearing Metro / React Native cache");
  var tmpDir = os.tmpdir();
  ["react-", "metro-", "haste-map-"].forEach(function (prefix) {
    rimrafGlob(tmpDir, prefix);
  });

  // Step 4: Clean Android build artifacts
  log("Cleaning Android build");
  var androidDir = path.join(PROJECT_ROOT, "android");
  run(GRADLEW + " clean", androidDir);
  rimraf(path.join(androidDir, ".gradle"));
  rimraf(path.join(androidDir, "build"));
  rimraf(path.join(androidDir, "app", "build"));

  // Step 5: Clear Gradle global caches
  log("Clearing Gradle caches");
  var gradleHome = path.join(os.homedir(), ".gradle", "caches");
  ["transforms-", "build-cache-"].forEach(function (prefix) {
    rimrafGlob(gradleHome, prefix);
  });

  // Step 6: Build Release APK
  log("Building Release APK");
  run(GRADLEW + " assembleRelease", androidDir);

  // Success — remove log file (it's empty on success)
  logStream.end();
  rimraf(ERROR_LOG);

  log("BUILD SUCCESSFUL");
  console.log("APK location: " + APK_OUTPUT);
  console.log("");
} catch (err) {
  // On failure, end the log stream and display failure message
  logStream.end();
  console.log("");
  console.log("========================================");
  console.log("  BUILD FAILED");
  console.log("  Error log saved to: " + ERROR_LOG);
  console.log("========================================");

  // Re-throw the error to stop the process and return failure code
  process.exit(1);
}
