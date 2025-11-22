# Install Script API Contract

**Feature**: 003-curl-install
**Date**: 2025-11-21

## Command-Line Interface

### Basic Usage

```bash
curl -fsSL https://install.mt-prism.dev | sh
```

### Options

```bash
curl -fsSL https://install.mt-prism.dev | sh -s -- [OPTIONS]
```

| Option | Description | Example |
|--------|-------------|---------|
| `--version <ver>` | Install specific version | `--version 1.2.3` |
| `--latest` | Install latest release (default) | `--latest` |
| `--prefix <path>` | Custom install directory | `--prefix /opt/mt-prism` |
| `--uninstall` | Remove MT-PRISM | `--uninstall` |
| `--help` | Show help message | `--help` |
| `--update` | Update to latest version | `--update` |

### Exit Codes

| Code | Meaning | User Action |
|------|---------|-------------|
| 0 | Success | None - installation complete |
| 1 | General error | Check error message |
| 2 | Prerequisites not met | Install Node.js 20+ |
| 3 | Download failed | Check network, retry |
| 4 | Verification failed | Report issue, checksum mismatch |
| 5 | Installation failed | Check permissions, disk space |

## Output Format

### Success Output

```
🚀 Installing MT-PRISM...

✓ Platform detected: darwin-arm64
✓ Node.js 20.10.0 found
✓ Downloading MT-PRISM v1.0.0...
✓ Verifying checksum...
✓ Installing dependencies...
✓ Configuring PATH...
✓ Creating .env configuration...

✅ MT-PRISM v1.0.0 installed successfully!

📁 Installed to: /Users/developer/.mt-prism
📝 Configuration: /Users/developer/.mt-prism/.env

Next steps:
1. Add your API key to .env:
   export ANTHROPIC_API_KEY=your-key-here

2. Start using MT-PRISM:
   prism --prd=./docs/requirements.md --project="My App"

For help: prism --help
Documentation: https://github.com/mt-osiris-tools/mt-prism
```

### Error Output

```
❌ Installation failed: Node.js not found

MT-PRISM requires Node.js 20 or higher.

📥 Install Node.js:
   macOS: brew install node
   Linux: https://nodejs.org/en/download/
   Windows: Use WSL and install via apt

After installing Node.js, re-run:
   curl -fsSL https://install.mt-prism.dev | sh
```

## Installation Manifest API

### File: ~/.mt-prism/install.json

**Format**: JSON

**Schema**:
```json
{
  "version": "string (semver)",
  "install_path": "string (absolute path)",
  "installed_at": "string (ISO8601)",
  "node_version": "string",
  "platform": "string"
}
```

**Usage**:
- Created by install script on successful installation
- Read by update/uninstall operations
- Deleted on uninstall

## Prerequisites API

### Node.js Version Check

**Command**: `node --version`

**Expected Output**: `v20.0.0` or higher

**Validation**:
```bash
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//')
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$MAJOR_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required (found: $NODE_VERSION)"
  exit 2
fi
```

## GitHub Release Asset Structure

### Expected Assets

Each release must include:

```
mt-prism-{version}.tar.gz
mt-prism-{version}.tar.gz.sha256
```

**Tarball Contents**:
```
mt-prism-{version}/
├── package.json
├── dist/           # Pre-built JavaScript
├── .env.example
├── README.md
└── LICENSE
```

## Shell Profile Updates

### PATH Addition

**bash** (`~/.bashrc`):
```bash
# MT-PRISM
export PATH="$HOME/.mt-prism/bin:$PATH"
```

**zsh** (`~/.zshrc`):
```bash
# MT-PRISM
export PATH="$HOME/.mt-prism/bin:$PATH"
```

**Detection Logic**:
```bash
SHELL_NAME=$(basename "$SHELL")
case "$SHELL_NAME" in
  bash)
    PROFILE="$HOME/.bashrc"
    ;;
  zsh)
    PROFILE="$HOME/.zshrc"
    ;;
  *)
    echo "⚠️  Unknown shell: $SHELL_NAME"
    echo "Manually add to PATH: export PATH=\"\$HOME/.mt-prism/bin:\$PATH\""
    ;;
esac
```
