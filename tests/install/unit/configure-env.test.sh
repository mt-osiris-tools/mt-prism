#!/usr/bin/env bats
#
# Unit tests for environment configuration
#

load '../../../node_modules/bats-support/load'
load '../../../node_modules/bats-assert/load'

setup() {
  source scripts/install/configure-env.sh
  TEST_DIR=$(mktemp -d)
}

teardown() {
  rm -rf "$TEST_DIR"
}

@test "configure_env creates .env from template" {
  # Create template
  echo "ANTHROPIC_API_KEY=your-key-here" > "${TEST_DIR}/.env.example"

  run configure_env "$TEST_DIR"
  assert_success
  assert_output --partial "Created .env"

  # Verify .env was created
  [ -f "${TEST_DIR}/.env" ]
}

@test "configure_env preserves existing .env" {
  # Create existing .env
  echo "EXISTING_VALUE=preserved" > "${TEST_DIR}/.env"
  echo "TEMPLATE_VALUE=template" > "${TEST_DIR}/.env.example"

  run configure_env "$TEST_DIR"
  assert_success
  assert_output --partial "already exists"

  # Verify existing content preserved
  grep -q "EXISTING_VALUE=preserved" "${TEST_DIR}/.env"
}

@test "configure_env handles missing template gracefully" {
  run configure_env "$TEST_DIR"
  assert_success
  assert_output --partial "not found"
}
