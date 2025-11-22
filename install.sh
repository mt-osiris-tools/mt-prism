#!/usr/bin/env bash
#
# MT-PRISM Installation Script
#
# Usage: curl -fsSL https://install.mt-prism.dev | sh
#
set -euo pipefail

# Script version
INSTALLER_VERSION="1.0.0"

# Installation configuration
INSTALL_DIR="${HOME}/.mt-prism"
BIN_DIR="${INSTALL_DIR}/bin"
GITHUB_REPO="mt-osiris-tools/mt-prism"
TEMP_DIR=""
TARGET_VERSION=""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Error handling and cleanup
cleanup() {
  local exit_code=$?
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    echo "🧹 Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
  fi

  if [ $exit_code -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Installation failed (exit code: $exit_code)${NC}" >&2
    echo ""
    echo "For help, visit: https://github.com/${GITHUB_REPO}/issues" >&2
  fi

  exit $exit_code
}

trap cleanup EXIT INT TERM

# Utility functions
log_info() { echo -e "${BLUE}ℹ${NC}  $*"; }
log_success() { echo -e "${GREEN}✓${NC} $*"; }
log_error() { echo -e "${RED}❌${NC} $*" >&2; }
log_step() { echo -e "${BLUE}▶${NC}  $*"; }

# Main installation function
main() {
  echo ""
  echo "╔═══════════════════════════════════════════════════════════╗"
  echo "║              MT-PRISM Installer v${INSTALLER_VERSION}                  ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""

  # Create temp directory
  TEMP_DIR=$(mktemp -d)

  log_info "Installation directory: ${INSTALL_DIR}"
  log_info "Temporary directory: ${TEMP_DIR}"
  echo ""

  # Installation steps (to be implemented in Phase 3)
  log_step "Phase 2 foundational utilities complete"
  log_step "Phase 3 implementation (US1) coming next"

  echo ""
  log_success "Phase 2 setup complete!"
}

# Parse command line arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --help|-h)
        show_help
        exit 0
        ;;
      --version)
        shift
        TARGET_VERSION="$1"
        ;;
      --prefix)
        shift
        INSTALL_DIR="$1"
        BIN_DIR="${INSTALL_DIR}/bin"
        ;;
      --uninstall)
        uninstall_prism
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        show_help
        exit 1
        ;;
    esac
    shift
  done
}

show_help() {
  cat <<EOF
MT-PRISM Installer

Usage: curl -fsSL https://install.mt-prism.dev | sh
       curl -fsSL https://install.mt-prism.dev | sh -s -- [OPTIONS]

Options:
  --version <ver>   Install specific version
  --prefix <path>   Custom installation directory (default: ~/.mt-prism)
  --uninstall       Remove MT-PRISM
  --help            Show this message

Examples:
  # Install latest version
  curl -fsSL https://install.mt-prism.dev | sh

  # Install specific version
  curl -fsSL https://install.mt-prism.dev | sh -s -- --version 1.2.3

For more info: https://github.com/${GITHUB_REPO}
EOF
}

uninstall_prism() {
  log_info "Uninstalling MT-PRISM..."
  # Uninstall logic will be added in Phase 5 (US3)
  log_info "Uninstall feature coming in Phase 5"
}

# Run installer
parse_args "$@"
main
