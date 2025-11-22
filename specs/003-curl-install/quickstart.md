# Quickstart: Curl-Based Installation

**Feature**: 003-curl-install
**Audience**: Developers implementing the install script
**Time**: 30 minutes to understand, 2-3 hours to implement MVP

## What You're Building

A one-command installer for MT-PRISM that reduces setup from 5+ manual steps to a single curl command, following patterns from rustup and nvm.

## Before You Start

**Prerequisites**:
- Understand shell scripting (bash)
- Familiar with curl-based installers
- Have Docker for testing

**Read First**:
1. [spec.md](spec.md) - Feature requirements
2. [research.md](research.md) - Technical decisions
3. [data-model.md](data-model.md) - Installation manifest schema

## Implementation Steps

### Step 1: Create Basic Install Script (P1)

**File**: `install.sh` (repo root)

**Core Functions**:
```bash
#!/usr/bin/env bash
set -euo pipefail

main() {
  detect_platform
  verify_prerequisites
  download_release
  verify_checksum
  install_package
  configure_path
  create_manifest
  verify_installation
  show_success_message
}
```

**Test**: Can install on clean system

### Step 2: Add Platform Detection

**File**: `scripts/install/detect-platform.sh`

**Logic**:
- Detect OS: `uname -s` → darwin/linux/msys
- Detect arch: `uname -m` → x86_64/arm64/aarch64
- Map to platform string: "darwin-arm64", "linux-x64", etc.

**Test**: Correctly identifies macOS ARM, Linux x64, WSL

### Step 3: Add Prerequisite Checking

**File**: `scripts/install/verify-prereqs.sh`

**Checks**:
- Node.js installed: `command -v node`
- Node.js version: Parse `node --version`, check >= 20
- npm available: `command -v npm`
- curl available: `command -v curl`
- Disk space: `df -h ~/.mt-prism`

**Test**: Fails gracefully when prerequisites missing

### Step 4: Add Download Logic

**File**: `scripts/install/download-release.sh`

**Steps**:
1. Query GitHub API for version
2. Extract tarball URL
3. Download with progress indicator
4. Download SHA256 checksum
5. Verify checksum matches
6. Extract to temp directory

**Test**: Downloads correct version, verifies checksum

### Step 5: Add Installation Logic

**Core Steps**:
1. Move extracted files to `~/.mt-prism/`
2. Run `npm install --production`
3. Create symlink: `~/.mt-prism/bin/prism`
4. Update shell profile with PATH
5. Create `.env` from template

**Test**: Installation completes, `prism --version` works

### Step 6: Add Configuration (P2)

**File**: `scripts/install/configure-env.sh`

**Logic**:
- Check if `.env` exists
- If not, copy `.env.example` to `.env`
- Add helpful comments about required keys
- Preserve existing `.env` if present

**Test**: .env created with template, existing preserved

### Step 7: Add Version Management (P3)

**Features**:
- `--version X.Y.Z`: Install specific version
- `--update`: Update to latest
- Detect existing installation via `install.json`
- Prompt for update/reinstall/cancel

**Test**: Can install v1.0.0, then update to v1.1.0

## Testing Strategy

### Unit Tests (Bats)

**Setup**:
```bash
npm install --save-dev bats
```

**Test Files**:
- `tests/install/unit/detect-platform.test.sh`
- `tests/install/unit/verify-prereqs.test.sh`
- `tests/install/unit/download-release.test.sh`

**Run**:
```bash
bats tests/install/unit/
```

### Integration Tests (Docker)

**Platforms to Test**:
- Ubuntu 22.04 (linux-x64)
- Alpine Linux (linux-x64, minimal)
- macOS via GitHub Actions (darwin-arm64)

**Test Script Pattern**:
```bash
docker run --rm -v $(pwd):/app ubuntu:22.04 bash -c "
  apt-get update && apt-get install -y curl nodejs npm
  cd /app
  ./install.sh
  ~/.mt-prism/bin/prism --version
"
```

## Files to Create

**Phase 1 (MVP - P1)**:
1. `install.sh` - Main script (~500 lines)
2. `scripts/install/detect-platform.sh` (~50 lines)
3. `scripts/install/verify-prereqs.sh` (~100 lines)
4. `scripts/install/download-release.sh` (~150 lines)
5. `tests/install/unit/*.test.sh` (3 files, ~300 lines total)
6. `.github/workflows/test-installer.yml` (~80 lines)

**Phase 2 (Enhancement - P2)**:
7. `scripts/install/configure-env.sh` (~80 lines)

**Phase 3 (Advanced - P3)**:
8. Version management in `install.sh` (~100 lines added)
9. Update/uninstall functions (~150 lines added)

**Total**: ~1,500 lines across 10 files

## Development Timeline

**Phase 1** (P1 - Basic Install): 2-3 hours
- Create install.sh skeleton
- Implement core functions
- Add basic tests
- Test on 2 platforms

**Phase 2** (P2 - Auto-Config): 1 hour
- Add .env generation
- Test config preservation

**Phase 3** (P3 - Version Management): 2 hours
- Add version selection
- Add update/uninstall
- Integration testing

**Total**: 5-6 hours to complete feature

## Success Verification

After implementation, verify:

1. **Basic Install**: `curl -fsSL ... | sh` completes in <30s
2. **Verification**: `prism --version` returns correct version
3. **PATH**: Command works from any directory
4. **Config**: `.env` exists with template
5. **Manifest**: `~/.mt-prism/install.json` has correct data
6. **Cross-Platform**: Works on macOS, Ubuntu, Alpine
7. **Idempotency**: Running twice doesn't break installation
8. **Rollback**: Failed install doesn't leave partial files

## Common Pitfalls

1. **Shell Portability**: Test on bash and zsh, avoid bashisms
2. **PATH Escaping**: Properly quote paths with spaces
3. **Checksum Verification**: Always verify before extracting
4. **Cleanup**: Use `trap` to clean up temp files on error
5. **Exit Codes**: Use meaningful codes for different failures
6. **Progress Indicators**: Show what's happening (downloading, installing, etc.)
7. **Preserve User Data**: Never delete `.env` or `.prism/` sessions

## References

- rustup installer: https://sh.rustup.rs
- nvm installer: https://github.com/nvm-sh/nvm/blob/master/install.sh
- Bats framework: https://github.com/bats-core/bats-core
- GitHub Releases API: https://docs.github.com/en/rest/releases
