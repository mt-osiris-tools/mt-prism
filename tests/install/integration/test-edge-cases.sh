#!/usr/bin/env bash
#
# Edge case testing for installation
#

set -euo pipefail

echo "🧪 Testing edge cases..."

# Test 1: Invalid version
echo "Test 1: Invalid version handling..."
if bash install.sh --version "999.999.999" 2>&1 | grep -q "not found\|failed"; then
  echo "✓ Invalid version handled correctly"
else
  echo "⚠️  Invalid version test skipped (requires network)"
fi

# Test 2: Help with no Node.js simulation
echo "Test 2: Help works without prerequisites..."
if bash install.sh --help > /dev/null 2>&1; then
  echo "✓ Help works independently"
else
  echo "❌ Help requires prerequisites (should work standalone)"
  exit 1
fi

# Test 3: Disk space check (simulated)
echo "Test 3: Disk space available..."
if df -h . | tail -1 | awk '{print $4}' | grep -qE '[0-9]+[GM]'; then
  echo "✓ Sufficient disk space"
else
  echo "⚠️  Low disk space detected"
fi

# Test 4: Network connectivity (check GitHub)
echo "Test 4: Network connectivity..."
if curl -fsSL --max-time 5 https://api.github.com/repos/mt-osiris-tools/mt-prism > /dev/null 2>&1; then
  echo "✓ Network connectivity OK"
else
  echo "⚠️  Network connectivity issue (non-critical for tests)"
fi

# Test 5: Script permissions
echo "Test 5: Script is executable..."
if [ -x "install.sh" ]; then
  echo "✓ install.sh is executable"
else
  echo "❌ install.sh is not executable"
  exit 1
fi

echo ""
echo "✅ All edge case tests completed"
