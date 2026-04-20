#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const scriptsDir = path.join(__dirname);

if (isWindows) {
  const ps1 = path.join(scriptsDir, 'setup.ps1');
  console.log('[INFO]  Detected Windows — running PowerShell setup...\n');
  execSync(
    `powershell -ExecutionPolicy Bypass -File "${ps1}"`,
    { stdio: 'inherit' }
  );
} else {
  const sh = path.join(scriptsDir, 'setup.sh');
  console.log(`[INFO]  Detected ${process.platform} — running bash setup...\n`);
  execSync(`bash "${sh}"`, { stdio: 'inherit' });
}
