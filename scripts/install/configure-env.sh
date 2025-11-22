#!/usr/bin/env bash
#
# Environment Configuration Utility
# Sets up .env file from template
#

configure_env() {
  local install_dir="$1"
  local env_file="${install_dir}/.env"
  local env_example="${install_dir}/.env.example"

  echo "⚙️  Configuring environment..."

  # Check if .env already exists
  if [ -f "$env_file" ]; then
    echo "✓ .env file already exists (preserved)"
    echo "ℹ️  Review ${env_file} and update API keys as needed"
    return 0
  fi

  # Check if template exists
  if [ ! -f "$env_example" ]; then
    echo "⚠️  .env.example not found, skipping .env creation"
    echo "ℹ️  You'll need to create .env manually with your API keys"
    return 0
  fi

  # Copy template to .env
  cp "$env_example" "$env_file"

  echo "✓ Created .env from template"
  echo ""
  echo "📝 Next: Add your API key to ${env_file}"
  echo "   Required: ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY"
  echo ""

  return 0
}

# Export for use in other scripts
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  configure_env "$@"
fi
