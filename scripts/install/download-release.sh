#!/usr/bin/env bash
#
# GitHub Release Download Utility
# Downloads MT-PRISM releases from GitHub
#

GITHUB_REPO="mt-osiris-tools/mt-prism"
GITHUB_API="https://api.github.com/repos/${GITHUB_REPO}"

get_latest_version() {
  local latest_url="${GITHUB_API}/releases/latest"
  curl -fsSL "$latest_url" | grep '"tag_name":' | sed -E 's/.*"tag_name": "v?([^"]+)".*/\1/'
}

get_download_url() {
  local version="$1"
  local tag="v${version}"

  local release_url="${GITHUB_API}/releases/tags/${tag}"
  curl -fsSL "$release_url" | \
    grep "browser_download_url.*tar.gz\"" | \
    grep -v ".sha256" | \
    sed -E 's/.*"browser_download_url": "([^"]+)".*/\1/' | \
    head -n 1
}

download_release() {
  local version="$1"
  local output_path="$2"

  echo "📥 Downloading MT-PRISM v${version}..."

  local download_url
  download_url=$(get_download_url "$version")

  if [ -z "$download_url" ]; then
    echo "❌ Could not find download URL for version ${version}" >&2
    return 3
  fi

  # Retry logic: 3 attempts with exponential backoff
  local attempt=1
  local max_attempts=3
  local wait_time=2

  while [ $attempt -le $max_attempts ]; do
    if curl -fL --progress-bar "$download_url" -o "$output_path"; then
      echo "✓ Download complete"
      return 0
    fi

    if [ $attempt -lt $max_attempts ]; then
      echo "⚠️  Download failed (attempt $attempt/$max_attempts), retrying in ${wait_time}s..." >&2
      sleep $wait_time
      wait_time=$((wait_time * 2))
    fi

    attempt=$((attempt + 1))
  done

  echo "❌ Download failed after $max_attempts attempts" >&2
  return 3
}

download_checksum() {
  local version="$1"
  local output_path="$2"

  local tag="v${version}"
  local checksum_url="${GITHUB_API}/releases/tags/${tag}"

  curl -fsSL "$checksum_url" | \
    grep "browser_download_url.*sha256\"" | \
    sed -E 's/.*"browser_download_url": "([^"]+)".*/\1/' | \
    head -n 1 | \
    xargs curl -fsSL -o "$output_path"
}

# Export for use in other scripts
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ "$#" -eq 0 ]; then
    get_latest_version
  else
    download_release "$@"
  fi
fi
