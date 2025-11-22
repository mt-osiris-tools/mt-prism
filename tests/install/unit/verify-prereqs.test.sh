#!/usr/bin/env bats
#
# Unit tests for prerequisite verification
#

load '../../../node_modules/bats-support/load'
load '../../../node_modules/bats-assert/load'

setup() {
  source scripts/install/verify-prereqs.sh
}

@test "verify_node_version succeeds when Node.js 20+ is installed" {
  if command -v node &> /dev/null; then
    run verify_node_version
    assert_success
    assert_output --partial 'Node.js'
  else
    skip "Node.js not installed"
  fi
}

@test "verify_npm succeeds when npm is installed" {
  if command -v npm &> /dev/null; then
    run verify_npm
    assert_success
    assert_output --partial 'npm'
  else
    skip "npm not installed"
  fi
}

@test "verify_curl succeeds when curl is installed" {
  run verify_curl
  assert_success
}

@test "verify_all_prerequisites checks all tools" {
  if command -v node &> /dev/null && command -v npm &> /dev/null; then
    run verify_all_prerequisites
    assert_success
  else
    skip "Prerequisites not met"
  fi
}
