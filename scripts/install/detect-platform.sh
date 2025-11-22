#!/usr/bin/env bash
#
# Platform Detection Utility
# Detects OS and architecture for MT-PRISM installation
#

detect_platform() {
  local os
  local arch

  # Detect OS
  case "$(uname -s)" in
    Darwin*)
      os="darwin"
      ;;
    Linux*)
      os="linux"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      os="windows"
      ;;
    *)
      echo "Unsupported OS: $(uname -s)" >&2
      return 1
      ;;
  esac

  # Detect architecture
  case "$(uname -m)" in
    x86_64|amd64)
      arch="x64"
      ;;
    arm64|aarch64)
      arch="arm64"
      ;;
    *)
      echo "Unsupported architecture: $(uname -m)" >&2
      return 1
      ;;
  esac

  echo "${os}-${arch}"
}

# Export for use in other scripts
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  detect_platform
fi
