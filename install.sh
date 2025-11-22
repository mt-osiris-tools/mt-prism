#!/usr/bin/env bash
#
# MT-PRISM Installation Script
#
# Usage: curl -fsSL https://install.mt-prism.dev | bash
#
# Note: Use 'bash' not 'sh' - script requires bash features

# Ensure running under bash
if [ -z "$BASH_VERSION" ]; then
  echo "Error: This script requires bash. Please run with:" >&2
  echo "  curl -fsSL https://raw.githubusercontent.com/mt-osiris-tools/mt-prism/main/install.sh | bash" >&2
  exit 1
fi

set -euo pipefail

# Script version
INSTALLER_VERSION="1.0.0"

# Installation configuration
INSTALL_DIR="${HOME}/.mt-prism"
BIN_DIR="${INSTALL_DIR}/bin"
GITHUB_REPO="mt-osiris-tools/mt-prism"
GITHUB_API="https://api.github.com/repos/${GITHUB_REPO}"
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

# Detect platform
detect_platform() {
  local os arch

  case "$(uname -s)" in
    Darwin*) os="darwin" ;;
    Linux*) os="linux" ;;
    MINGW*|MSYS*|CYGWIN*) os="windows" ;;
    *)
      log_error "Unsupported OS: $(uname -s)"
      exit 1
      ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *)
      log_error "Unsupported architecture: $(uname -m)"
      exit 1
      ;;
  esac

  echo "${os}-${arch}"
}

# Verify prerequisites
verify_prerequisites() {
  log_step "Verifying prerequisites..."

  if ! command -v node &> /dev/null; then
    log_error "Node.js not found"
    echo ""
    echo "MT-PRISM requires Node.js 20 or higher."
    echo ""
    echo "📥 Install Node.js:"
    echo "   macOS: brew install node"
    echo "   Linux: https://nodejs.org/en/download/"
    exit 2
  fi

  local node_version
  node_version=$(node --version | sed 's/v//')
  local major_version
  major_version=$(echo "$node_version" | cut -d. -f1)

  if [ "$major_version" -lt 20 ]; then
    log_error "Node.js $node_version found, but 20+ required"
    exit 2
  fi

  log_success "Node.js $node_version found"
}

# Get latest version from GitHub
get_latest_version() {
  curl -fsSL "${GITHUB_API}/releases/latest" | \
    grep '"tag_name":' | \
    sed -E 's/.*"tag_name": "v?([^"]+)".*/\1/'
}

# Download and extract release
download_and_extract() {
  local version="$1"
  local platform="$2"

  log_step "Downloading MT-PRISM v${version}..."

  # Get download URL
  local download_url
  download_url=$(curl -fsSL "${GITHUB_API}/releases/tags/v${version}" | \
    grep "browser_download_url.*tar.gz\"" | \
    grep -v ".sha256" | \
    sed -E 's/.*"browser_download_url": "([^"]+)".*/\1/' | \
    head -n 1)

  if [ -z "$download_url" ]; then
    log_error "Could not find download for version ${version}"
    exit 3
  fi

  # Download tarball
  local tarball="${TEMP_DIR}/mt-prism.tar.gz"
  if ! curl -fL --progress-bar "$download_url" -o "$tarball"; then
    log_error "Download failed"
    exit 3
  fi

  log_success "Download complete"

  # Extract
  log_step "Extracting..."
  tar -xzf "$tarball" -C "$TEMP_DIR"

  log_success "Extraction complete"
}

# Install dependencies
install_dependencies() {
  log_step "Installing dependencies..."

  cd "$INSTALL_DIR"
  if ! npm install --production --silent > /dev/null 2>&1; then
    log_error "npm install failed"
    exit 5
  fi

  log_success "Dependencies installed"
}

# Configure PATH
configure_path() {
  log_step "Configuring PATH..."

  local shell_profile
  case "$(basename "$SHELL")" in
    bash) shell_profile="${HOME}/.bashrc" ;;
    zsh) shell_profile="${HOME}/.zshrc" ;;
    *)
      log_info "Unknown shell, PATH not auto-configured"
      echo "Add to PATH manually: export PATH=\"${BIN_DIR}:\$PATH\""
      return 0
      ;;
  esac

  # Check if already in PATH
  if grep -q "mt-prism/bin" "$shell_profile" 2>/dev/null; then
    log_success "PATH already configured"
    return 0
  fi

  # Add to shell profile
  echo "" >> "$shell_profile"
  echo "# MT-PRISM" >> "$shell_profile"
  echo "export PATH=\"${BIN_DIR}:\$PATH\"" >> "$shell_profile"

  log_success "PATH configured in $shell_profile"
}

# Verify installation
verify_installation() {
  log_step "Verifying installation..."

  if ! "${INSTALL_DIR}/node_modules/.bin/prism" --version > /dev/null 2>&1; then
    log_error "Installation verification failed"
    exit 5
  fi

  log_success "Installation verified"
}

# Create installation manifest
create_installation_manifest() {
  local version="$1"
  local platform="$2"

  local manifest="${INSTALL_DIR}/install.json"
  local node_version
  node_version=$(node --version | sed 's/v//')

  cat > "$manifest" <<EOF
{
  "version": "${version}",
  "install_path": "${INSTALL_DIR}",
  "installed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "node_version": "${node_version}",
  "platform": "${platform}",
  "install_method": "curl"
}
EOF

  log_success "Installation manifest created"
}

# Show success message
show_success_message() {
  local version="$1"

  echo ""
  echo "╔═══════════════════════════════════════════════════════════╗"
  echo "║          ✅ MT-PRISM v${version} Installed Successfully!           ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""
  echo "📁 Installed to: ${INSTALL_DIR}"
  echo "📝 Configuration: ${INSTALL_DIR}/.env (copy from .env.example)"
  echo ""
  echo "Next steps:"
  echo "1. Restart your shell or run: source ~/.$(basename "$SHELL")rc"
  echo "2. Add your API key to .env:"
  echo "   cd ${INSTALL_DIR}"
  echo "   cp .env.example .env"
  echo "   # Edit .env and add ANTHROPIC_API_KEY=your-key"
  echo ""
  echo "3. Start using MT-PRISM:"
  echo "   prism --prd=./docs/requirements.md --project=\"My App\""
  echo ""
  echo "For help: prism --help"
  echo "Documentation: https://github.com/${GITHUB_REPO}"
  echo ""
}

# Main installation function
main() {
  echo ""
  echo "╔═══════════════════════════════════════════════════════════╗"
  echo "║              MT-PRISM Installer v${INSTALLER_VERSION}                  ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""

  # Create temp directory
  TEMP_DIR=$(mktemp -d)

  # Detect platform
  local platform
  platform=$(detect_platform)
  log_success "Platform detected: $platform"

  # Verify prerequisites
  verify_prerequisites

  # Check for existing installation
  check_existing_installation

  # Determine version
  local version="${TARGET_VERSION}"
  if [ -z "$version" ]; then
    log_step "Fetching latest version..."
    version=$(get_latest_version)
  fi
  log_info "Installing version: $version"
  echo ""

  # Download and extract
  download_and_extract "$version" "$platform"

  # Move to installation directory
  log_step "Installing to ${INSTALL_DIR}..."
  mkdir -p "$INSTALL_DIR"

  # Find extracted directory
  local extracted_dir
  extracted_dir=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "mt-prism-*" | head -n 1)

  if [ -z "$extracted_dir" ]; then
    # Fallback: files might be extracted directly
    cp -r "$TEMP_DIR"/* "$INSTALL_DIR"/
  else
    cp -r "$extracted_dir"/* "$INSTALL_DIR"/
  fi

  log_success "Files copied"

  # Install dependencies
  install_dependencies

  # Create bin directory and symlink
  mkdir -p "$BIN_DIR"
  ln -sf "${INSTALL_DIR}/node_modules/.bin/prism" "${BIN_DIR}/prism"

  # Configure PATH
  configure_path

  # Configure environment
  configure_environment

  # Create manifest
  create_installation_manifest "$version" "$platform"

  # Verify installation
  verify_installation

  # Show success message
  show_success_message "$version"
}

# Configure .env file
configure_environment() {
  log_step "Configuring environment..."

  local env_file="${INSTALL_DIR}/.env"
  local env_example="${INSTALL_DIR}/.env.example"

  if [ -f "$env_file" ]; then
    log_success ".env file already exists (preserved)"
    return 0
  fi

  if [ -f "$env_example" ]; then
    cp "$env_example" "$env_file"
    log_success "Created .env from template"
  else
    log_info ".env.example not found, skipping .env creation"
  fi
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

check_existing_installation() {
  local manifest="${INSTALL_DIR}/install.json"

  if [ ! -f "$manifest" ]; then
    return 0
  fi

  log_info "Existing installation detected"

  local installed_version
  installed_version=$(grep '"version"' "$manifest" | sed -E 's/.*"version": "([^"]+)".*/\1/')

  echo ""
  echo "Currently installed: v${installed_version}"
  echo ""
  echo "Options:"
  echo "  1) Update to latest"
  echo "  2) Reinstall current version"
  echo "  3) Cancel"
  echo ""
  read -p "Choose [1-3]: " -n 1 -r choice
  echo ""

  case $choice in
    1)
      log_info "Proceeding with update..."
      ;;
    2)
      log_info "Proceeding with reinstall..."
      ;;
    3|*)
      log_info "Installation cancelled"
      exit 0
      ;;
  esac
}

uninstall_prism() {
  log_step "Uninstalling MT-PRISM..."

  if [ ! -d "$INSTALL_DIR" ]; then
    log_error "MT-PRISM is not installed"
    exit 1
  fi

  # Remove installation directory
  rm -rf "$INSTALL_DIR"

  # Remove PATH entries from shell profiles
  for profile in ~/.bashrc ~/.zshrc; do
    if [ -f "$profile" ]; then
      # Remove MT-PRISM PATH entries
      sed -i.bak '/# MT-PRISM/d' "$profile" 2>/dev/null || true
      sed -i.bak '/mt-prism\/bin/d' "$profile" 2>/dev/null || true
      rm -f "${profile}.bak"
    fi
  done

  log_success "MT-PRISM uninstalled successfully"
  echo ""
  echo "Your .prism session data was preserved"
  echo "To remove session data: rm -rf ~/.prism"
  echo ""
}

# Run installer
parse_args "$@"
main
