#!/usr/bin/env node

/**
 * Metro start wrapper for Node.js 18+
 * Fixes: "ERR_OSSL_EVP_UNSUPPORTED" error with older React Native versions
 */

const { execSync } = require('child_process');

// Run Metro with legacy OpenSSL provider
process.env.NODE_OPTIONS = '--openssl-legacy-provider';

try {
  execSync('react-native start', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start Metro:', error);
  process.exit(1);
}
