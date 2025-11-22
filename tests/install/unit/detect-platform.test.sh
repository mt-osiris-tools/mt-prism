#!/usr/bin/env bats
#
# Unit tests for platform detection
#

load '../../../node_modules/bats-support/load'
load '../../../node_modules/bats-assert/load'

setup() {
  # Source the script
  source scripts/install/detect-platform.sh
}

@test "detect_platform returns valid format" {
  run detect_platform
  assert_success
  assert_output --regexp '^(darwin|linux|windows)-(x64|arm64)$'
}

@test "detect_platform detects macOS" {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    run detect_platform
    assert_success
    assert_output --partial 'darwin'
  else
    skip "Not running on macOS"
  fi
}

@test "detect_platform detects Linux" {
  if [[ "$(uname -s)" == "Linux" ]]; then
    run detect_platform
    assert_success
    assert_output --partial 'linux'
  else
    skip "Not running on Linux"
  fi
}
