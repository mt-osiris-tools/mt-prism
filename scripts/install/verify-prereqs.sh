#!/usr/bin/env bash
#
# Prerequisite Verification Utility
# Checks for required tools and versions
#

verify_node_version() {
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found" >&2
    echo "" >&2
    echo "MT-PRISM requires Node.js 20 or higher." >&2
    echo "" >&2
    echo "📥 Install Node.js:" >&2
    echo "   macOS: brew install node" >&2
    echo "   Linux: https://nodejs.org/en/download/" >&2
    echo "   Windows: Use WSL and install via apt" >&2
    echo "" >&2
    return 2
  fi

  local node_version
  node_version=$(node --version 2>/dev/null | sed 's/v//')
  local major_version
  major_version=$(echo "$node_version" | cut -d. -f1)

  if [ "$major_version" -lt 20 ]; then
    echo "❌ Node.js $node_version found, but 20+ required" >&2
    echo "📥 Update from: https://nodejs.org/" >&2
    return 2
  fi

  echo "✓ Node.js $node_version found"
  return 0
}

verify_npm() {
  if ! command -v npm &> /dev/null; then
    echo "❌ npm not found (should come with Node.js)" >&2
    return 2
  fi
  echo "✓ npm $(npm --version) found"
  return 0
}

verify_curl() {
  if ! command -v curl &> /dev/null; then
    echo "❌ curl not found" >&2
    echo "Install curl and try again" >&2
    return 2
  fi
  return 0
}

verify_all_prerequisites() {
  verify_curl || return $?
  verify_node_version || return $?
  verify_npm || return $?
  return 0
}

# Export for use in other scripts
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  verify_all_prerequisites
fi
