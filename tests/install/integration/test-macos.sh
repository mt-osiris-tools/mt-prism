#!/usr/bin/env bash
#
# Integration test for macOS installation
#

set -euo pipefail

echo "🧪 Testing installation on macOS (simulated)..."

# Test help flag
if ! bash install.sh --help > /dev/null 2>&1; then
  echo "❌ --help flag failed"
  exit 1
fi

echo "✓ Help flag works"

# Test platform detection on macOS
if [[ "$(uname -s)" == "Darwin" ]]; then
  if ! bash scripts/install/detect-platform.sh | grep -q "darwin"; then
    echo "❌ Platform detection failed on macOS"
    exit 1
  fi
  echo "✓ Platform detection works"
else
  echo "⏭️  Skipping macOS-specific tests (not on macOS)"
fi

echo "✅ macOS integration tests passed"
