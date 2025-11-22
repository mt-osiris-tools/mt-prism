#!/usr/bin/env bash
#
# Checksum Verification Utility
# Verifies file integrity using SHA256
#

verify_checksum() {
  local file_path="$1"
  local checksum_path="$2"

  echo "🔒 Verifying download integrity..."

  if [ ! -f "$checksum_path" ]; then
    echo "⚠️  Checksum file not found, skipping verification" >&2
    return 0
  fi

  local expected
  expected=$(cat "$checksum_path" | awk '{print $1}')

  local actual
  if command -v shasum &> /dev/null; then
    actual=$(shasum -a 256 "$file_path" | awk '{print $1}')
  elif command -v sha256sum &> /dev/null; then
    actual=$(sha256sum "$file_path" | awk '{print $1}')
  else
    echo "⚠️  No SHA256 utility found, skipping verification" >&2
    return 0
  fi

  if [ "$expected" != "$actual" ]; then
    echo "❌ Checksum verification failed!" >&2
    echo "   Expected: $expected" >&2
    echo "   Got:      $actual" >&2
    return 4
  fi

  echo "✓ Checksum verified"
  return 0
}

# Export for use in other scripts
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  verify_checksum "$@"
fi
