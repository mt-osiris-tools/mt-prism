# Data Model: Curl-Based Installation

**Feature**: 003-curl-install
**Date**: 2025-11-21

## Entities

### Installation Manifest

Tracks installed MT-PRISM version and configuration.

**Location**: `~/.mt-prism/install.json`

**Schema**:
```json
{
  "version": "1.0.0",
  "install_path": "/Users/developer/.mt-prism",
  "installed_at": "2025-11-21T18:45:00Z",
  "node_version": "20.10.0",
  "platform": "darwin-arm64",
  "install_method": "curl"
}
```

**Fields**:
- `version` (string, required): Installed MT-PRISM version (semver)
- `install_path` (string, required): Absolute path to installation directory
- `installed_at` (string, required): ISO8601 timestamp of installation
- `node_version` (string, required): Node.js version used during install
- `platform` (string, required): OS and architecture (e.g., "linux-x64", "darwin-arm64")
- `install_method` (string, required): Installation method ("curl", "git", "npm")

**Validation Rules**:
- version must be valid semver
- install_path must be absolute
- installed_at must be ISO8601
- node_version must match prerequisite (20+)

**State Transitions**:
- Created: On first successful installation
- Updated: On version updates
- Deleted: On uninstall

---

### GitHub Release Metadata

External data structure from GitHub Releases API.

**Source**: `https://api.github.com/repos/mt-osiris-tools/mt-prism/releases/latest`

**Relevant Fields**:
- `tag_name`: Version tag (e.g., "v1.0.0")
- `assets[]`: Download assets
  - `name`: Filename (e.g., "mt-prism-1.0.0.tar.gz")
  - `browser_download_url`: Download URL
- `body`: Release notes

**Usage**: Install script queries this API to find download URL and version info.

---

## Entity Relationships

```
Installation Manifest
  └─ references → GitHub Release (by version)
```

**Cardinality**:
- Each installation has exactly one manifest
- Manifest references one GitHub release version
- Multiple installations possible (different prefixes)

---

## File Artifacts

### install.sh

**Purpose**: Main installation script executed via curl

**Location**: Repository root

**Size**: ~500 lines

**Dependencies**: Standard POSIX utilities (curl, tar, grep, sed)

---

### .env Template

**Purpose**: Configuration template for API keys

**Source**: `.env.example` in repository

**Target**: User's installation directory

**Behavior**: Copied only if `.env` doesn't exist

---

## Installation States

```
[Not Installed]
    │
    ├─ Prerequisites Check
    │   ├─ PASS → [Downloading]
    │   └─ FAIL → [Error: No Node.js]
    │
[Downloading]
    │
    ├─ Download Complete
    │   ├─ Checksum PASS → [Installing]
    │   └─ Checksum FAIL → [Error: Corrupted Download]
    │
[Installing]
    │
    ├─ npm install Complete
    │   ├─ Success → [Configuring PATH]
    │   └─ Fail → [Error: Dependency Failure]
    │
[Configuring PATH]
    │
    ├─ PATH Updated
    │   └─ Success → [Installed]
    │
[Installed]
    │
    ├─ Update Available → [Updating]
    ├─ Uninstall Requested → [Uninstalling]
    └─ Working → [Installed]
```

---

## Data Flows

### Installation Flow

```
User runs curl command
    ↓
Download install.sh
    ↓
Execute install.sh
    ↓
├─ Detect platform
├─ Verify Node.js 20+
├─ Query GitHub Releases API
├─ Download tarball
├─ Verify checksum
├─ Extract to ~/.mt-prism/
├─ Run npm install
├─ Update shell profile
├─ Create .env (if needed)
├─ Write install.json
└─ Verify with `prism --version`
    ↓
Display success message
```

### Update Flow

```
User runs curl with --update
    ↓
Read ~/.mt-prism/install.json
    ↓
Query latest release
    ↓
Compare versions
    ↓
├─ Newer available → Download and install
└─ Already latest → Skip
    ↓
Preserve .env and .prism/ session data
    ↓
Update install.json with new version
```

---

## Storage Locations

**Installation Directory**: `~/.mt-prism/` (default)
```
~/.mt-prism/
├── bin/
│   └── prism → ../node_modules/.bin/prism
├── node_modules/
├── package.json
├── dist/
├── .env
└── install.json
```

**Session Data**: `~/.prism/` (preserved across updates)

**Shell Profiles**: `~/.bashrc` or `~/.zshrc` (PATH entries added)
