#!/usr/bin/env bash
#
# Installation Manifest Writer
# Creates install.json tracking installation metadata
#

create_manifest() {
  local install_dir="$1"
  local version="$2"
  local platform="$3"

  local manifest_path="${install_dir}/install.json"
  local node_version
  node_version=$(node --version 2>/dev/null | sed 's/v//')

  cat > "$manifest_path" <<EOF
{
  "version": "${version}",
  "install_path": "${install_dir}",
  "installed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "node_version": "${node_version}",
  "platform": "${platform}",
  "install_method": "curl"
}
EOF

  echo "✓ Installation manifest created"
  return 0
}

# Export for use in other scripts
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  create_manifest "$@"
fi
