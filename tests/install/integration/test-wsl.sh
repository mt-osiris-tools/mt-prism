#!/usr/bin/env bash
#
# Integration test for Windows/WSL installation
#

set -euo pipefail

echo "🧪 Testing installation on WSL (simulated)..."

# Check if running on WSL
if grep -qi microsoft /proc/version 2>/dev/null; then
  echo "✓ Running on WSL"

  # Test platform detection
  if ! bash scripts/install/detect-platform.sh | grep -q "linux"; then
    echo "❌ Platform detection failed on WSL"
    exit 1
  fi
  echo "✓ Platform detected correctly on WSL"
else
  echo "⏭️  Not running on WSL, skipping WSL-specific tests"
fi

# Test help flag
if ! bash install.sh --help > /dev/null 2>&1; then
  echo "❌ --help flag failed"
  exit 1
fi

echo "✓ Help flag works"

echo "✅ WSL integration tests passed"
