# Research: Curl-Based Installation Patterns

**Feature**: 003-curl-install
**Date**: 2025-11-21
**Status**: Complete

## Executive Summary

Research into curl-based installation patterns for CLI tools reveals well-established best practices from rustup, nvm, pyenv, and Homebrew. The approach is standardized: detect platform, verify prerequisites, download from releases, verify checksums, install to user directory, update PATH.

## Install Script Patterns

### Decision: Follow rustup/nvm Model

**Rationale**: These tools have proven reliability across millions of installations with excellent error handling and user experience.

**Key Patterns**:
1. Platform detection via `uname`
2. Fail-fast prerequisite validation
3. Download from GitHub Releases
4. SHA256 checksum verification
5. Atomic installation (temp → verify → move)
6. Shell profile auto-update
7. Post-install verification

**Alternatives Considered**:
- npm global install: Requires npm already configured
- Package managers (brew/apt): Platform-specific, requires separate maintenance
- Docker-based: Overkill for a CLI tool

### Decision: User-Local Installation (~/.mt-prism/)

**Rationale**: Avoids sudo requirements, works in restricted environments, follows modern best practices (nvm, rustup, pyenv all use user-local installs).

**Alternatives Considered**:
- `/usr/local/bin`: Requires sudo on most systems
- `/opt/mt-prism`: Less discoverable, still needs sudo
- System package managers: Too much overhead for initial release

## Version Management

### Decision: Use GitHub Releases API

**Rationale**: Free, reliable, versioned, includes checksums. Already part of GitHub workflow.

**API Endpoints**:
```bash
# Latest release
curl -s https://api.github.com/repos/mt-osiris-tools/mt-prism/releases/latest

# Specific version
curl -s https://api.github.com/repos/mt-osiris-tools/mt-prism/releases/tags/v1.2.3

# List all releases
curl -s https://api.github.com/repos/mt-osiris-tools/mt-prism/releases
```

**Alternatives Considered**:
- Custom version server: Unnecessary complexity
- npm registry: Still requires npm setup
- Static JSON file: Harder to maintain

## Error Handling Strategy

### Decision: Fail-Fast with Actionable Recovery

**Pattern**:
```bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

check_node_version() {
  if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    echo "📥 Install from: https://nodejs.org/"
    exit 2
  fi
}

trap cleanup EXIT  # Always cleanup on exit
```

**Rationale**: Clear error messages reduce support burden. Users know exactly what to fix.

**Alternatives Considered**:
- Silent failures: Poor user experience
- Automatic fixes (install Node.js): Too complex, fragile
- Continue despite errors: Leads to broken installations

## Testing Strategy

### Decision: Bats + Docker Integration Tests

**Unit Tests** (bats framework):
- Test each function in isolation
- Mock external dependencies
- Fast feedback (<1 second)

**Integration Tests** (Docker):
- Test on real platforms (Ubuntu, Alpine, macOS simulator)
- Verify full installation flow
- Catch platform-specific issues

**Rationale**: Bats is industry standard for shell testing. Docker provides reproducible test environments.

**Alternatives Considered**:
- shellspec: Less widely adopted
- Manual testing only: Error-prone, not repeatable
- No testing: Unacceptable for installation script

## Hosting Strategy

### Decision: GitHub Raw URL + GitHub Pages Redirect

**Primary URL**: `https://raw.githubusercontent.com/mt-osiris-tools/mt-prism/main/install.sh`

**Vanity URL** (optional): `https://install.mt-prism.dev` → redirects to raw URL

**Rationale**: GitHub raw URLs are free, reliable, and directly tied to repository. No separate hosting infrastructure needed.

**Alternatives Considered**:
- CDN (CloudFlare, Fastly): Adds complexity and cost
- Self-hosted: Requires infrastructure maintenance
- npm package with postinstall: Defeats the purpose

## Implementation Recommendations

1. **Start with MVP (P1)**: Basic install script covering happy path
2. **Add error handling (P1)**: Comprehensive prerequisite checking and rollback
3. **Add config automation (P2)**: .env file generation
4. **Add version management (P3)**: Specific version install and updates

## References

- [rustup.rs installer](https://sh.rustup.rs)
- [nvm install script](https://github.com/nvm-sh/nvm/blob/master/install.sh)
- [pyenv installer](https://github.com/pyenv/pyenv-installer)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Bats testing framework](https://github.com/bats-core/bats-core)
