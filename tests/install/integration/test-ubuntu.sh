#!/usr/bin/env bash
#
# Integration test for Ubuntu installation
#

set -euo pipefail

echo "🧪 Testing installation on Ubuntu (simulated)..."

# Test help flag
if ! bash install.sh --help > /dev/null 2>&1; then
  echo "❌ --help flag failed"
  exit 1
fi

echo "✓ Help flag works"

# Test script syntax
if ! bash -n install.sh; then
  echo "❌ Script has syntax errors"
  exit 1
fi

echo "✓ Script syntax valid"

echo "✅ Ubuntu integration tests passed"
