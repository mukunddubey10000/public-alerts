#!/usr/bin/env node

/**
 * Cross-platform setup entry point.
 * Detects OS and runs the appropriate setup script.
 *
 * This file intentionally uses only Node.js builtins and
 * syntax compatible with Node >= 10 so it can bootstrap
 * even when the "wrong" Node version is installed.
 */

var execSync = require("child_process").execSync;
var path = require("path");

var isWindows = process.platform === "win32";
var scriptsDir = __dirname;

if (isWindows) {
  var ps1 = path.join(scriptsDir, "setup.ps1");
  console.log("[INFO]  Detected Windows — running PowerShell setup...\n");
  try {
    execSync('powershell -ExecutionPolicy Bypass -File "' + ps1 + '"', {
      stdio: "inherit",
    });
  } catch (e) {
    process.exit(e.status || 1);
  }
} else {
  var sh = path.join(scriptsDir, "setup.sh");
  console.log(
    "[INFO]  Detected " + process.platform + " — running bash setup...\n",
  );
  try {
    execSync('bash "' + sh + '"', { stdio: "inherit" });
  } catch (e) {
    process.exit(e.status || 1);
  }
}
