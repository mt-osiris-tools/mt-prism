# Feature Specification: Curl-Based Installation

**Feature Branch**: `003-curl-install`
**Created**: 2025-11-21
**Status**: Draft
**Input**: User description: "let's make the instalation easier by adding a curl option to facilitate it"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Command Installation (Priority: P1)

Developers want to install MT-PRISM with a single curl command without manually cloning repositories, installing dependencies, or configuring environments. They expect a streamlined experience similar to other popular CLI tools like rustup or nvm.

**Why this priority**: This is the primary adoption barrier. A simple curl install reduces friction from ~5 steps to 1, enabling immediate evaluation and usage. Most developers are familiar with curl-based installers from tools they use daily.

**Independent Test**: Can be fully tested by running the curl command on a clean machine and verifying MT-PRISM is immediately usable. Delivers instant value by enabling zero-friction installation.

**Acceptance Scenarios**:

1. **Given** a developer on macOS with Node.js 20+ installed, **When** they run `curl -fsSL https://install.mt-prism.dev | sh`, **Then** MT-PRISM is installed globally and `prism --version` displays the current version
2. **Given** a developer on Linux with Node.js 20+ installed, **When** they run the curl install command, **Then** the installation succeeds and prism command is available in PATH
3. **Given** a developer without Node.js installed, **When** they run the curl command, **Then** they receive clear instructions to install Node.js 20+ first with download links
4. **Given** an existing MT-PRISM installation, **When** user runs curl install again, **Then** system detects existing installation and prompts to update, reinstall, or cancel

---

### User Story 2 - Automatic Configuration Setup (Priority: P2)

Developers want the installer to create a basic configuration file with helpful comments, avoiding manual `.env` file creation and reducing setup errors.

**Why this priority**: Configuration errors are a common source of frustration. Auto-generating a template with guidance reduces support burden and improves first-run experience.

**Independent Test**: Run curl install and verify `.env` file is created with all required variables documented and optional ones commented out.

**Acceptance Scenarios**:

1. **Given** no `.env` file exists in user's directory, **When** installation completes, **Then** system creates `.env` from template with inline documentation
2. **Given** `.env` already exists, **When** installation runs, **Then** system preserves existing file and shows message about reviewing configuration
3. **Given** installation completes, **When** user opens `.env` file, **Then** all required API keys are clearly marked with setup instructions

---

### User Story 3 - Version and Update Management (Priority: P3)

Developers want to install specific MT-PRISM versions or update to latest without reinstalling from scratch, supporting both development and production workflows.

**Why this priority**: Important for production environments requiring version pinning or teams standardizing on specific versions. Less critical for initial adoption.

**Independent Test**: Install a specific version, then upgrade to latest, verifying version changes correctly.

**Acceptance Scenarios**:

1. **Given** user runs `curl ... | sh -s -- --version 1.2.3`, **When** installation completes, **Then** exactly version 1.2.3 is installed
2. **Given** user runs `curl ... | sh -s -- latest`, **When** installation runs, **Then** latest version is installed
3. **Given** user runs `curl ... | sh -s -- update`, **When** system checks for updates, **Then** newer version is installed while preserving `.env` and session data

---

### Edge Cases

- What happens when installation fails mid-process (network interruption, disk space full)?
- How does system handle existing conflicting installations from manual git clone?
- What if user has insufficient permissions for global installation (no sudo)?
- How does installer work on Windows (WSL vs native PowerShell)?
- What happens when GitHub releases or install script URL are unavailable?
- How does system handle corrupted downloads or checksum failures?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a curl-accessible install script at https://install.mt-prism.dev or https://raw.githubusercontent.com/mt-osiris-tools/mt-prism/main/install.sh
- **FR-002**: Install script MUST detect operating system (macOS, Linux, Windows/WSL) and adjust installation accordingly
- **FR-003**: Install script MUST verify Node.js prerequisite (version 20+) before proceeding
- **FR-004**: Install script MUST download the appropriate MT-PRISM release from GitHub Releases
- **FR-005**: Install script MUST verify download integrity using checksums
- **FR-006**: Install script MUST install npm dependencies automatically via `npm install --production`
- **FR-007**: Install script MUST add the `prism` command to system PATH (update shell profile if needed)
- **FR-008**: Install script MUST create `.env` file from `.env.example` if it doesn't exist
- **FR-009**: Install script MUST support `--version VERSION` flag to install specific versions
- **FR-010**: Install script MUST support `--latest` flag to install latest release (default behavior)
- **FR-011**: Install script MUST detect existing installations and offer update/reinstall/cancel options
- **FR-012**: Install script MUST support `--uninstall` flag to cleanly remove MT-PRISM
- **FR-013**: Install script MUST be idempotent (safe to run multiple times without errors)
- **FR-014**: Install script MUST verify installation success by running `prism --version`
- **FR-015**: Install script MUST create installation manifest at `~/.mt-prism/install.json` tracking version and install path
- **FR-016**: Install script MUST provide progress indicators during download and installation
- **FR-017**: Install script MUST support `--prefix PATH` to specify custom installation directory
- **FR-018**: Install script MUST handle network failures with retry logic (3 attempts with backoff)
- **FR-019**: Install script MUST rollback failed installations to previous state
- **FR-020**: Install script MUST display post-install instructions including next steps and quick start command

### Key Entities

- **Install Script** (`install.sh`): Shell script that orchestrates download, dependency installation, PATH configuration, and verification
- **Installation Manifest** (`~/.mt-prism/install.json`): JSON file tracking installed version, install path, install date, and configuration status
- **GitHub Release**: Versioned package hosted on GitHub with tarball, checksums, and release notes
- **Environment Template** (`.env.example`): Template configuration file copied to `.env` during installation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers with Node.js pre-installed can complete MT-PRISM installation in under 30 seconds
- **SC-002**: Installation success rate exceeds 95% for users meeting prerequisites (Node.js 20+, network access)
- **SC-003**: First-time users can run their first PRD analysis within 2 minutes of installation (including API key setup)
- **SC-004**: Installation script handles 5 common failure scenarios with clear recovery instructions (no Node.js, network failure, permission denied, disk full, existing installation)
- **SC-005**: 90% of users successfully install without consulting documentation (measured by support ticket volume)
- **SC-006**: Update from older version to newer version completes in under 15 seconds while preserving configuration

## Assumptions *(mandatory)*

1. **Hosting**: Install script will be hosted on GitHub raw URL (https://raw.githubusercontent.com/...) or GitHub Pages for reliability
2. **Prerequisites**: Users have Node.js 20+ and npm installed; script validates but doesn't install these
3. **Platform Support**: Primary support for macOS (Intel/ARM) and Linux (amd64/arm64); Windows support via WSL only
4. **Network Access**: Users have unrestricted access to GitHub and npm registry (no corporate proxy)
5. **Permissions**: Install defaults to user-local directory (`~/.mt-prism/`) to avoid requiring sudo
6. **Shell Environment**: Users have bash or zsh shell; script updates appropriate profile file (`~/.bashrc`, `~/.zshrc`)
7. **Release Strategy**: MT-PRISM publishes GitHub Releases with semantic versioning and tarball assets
8. **Package Format**: Releases include pre-built dist/ directory to avoid requiring build step

## Out of Scope

- Automated Node.js installation (users install Node.js separately via official methods)
- Docker-based installation (separate use case, can be future feature)
- Native package managers (Homebrew, apt, snap) - can be added later
- Windows native installer (`.exe` or `.msi`) - WSL is sufficient for now
- Auto-update daemon/service (users manually re-run curl to update)
- IDE plugin installers (VS Code extension, etc.)
- Corporate proxy support (users configure git/npm proxy separately)

## Dependencies

- **Internal**: None (standalone installation feature)
- **External**:
  - GitHub for hosting install script and releases
  - npm registry for dependency downloads
  - Shell environment (bash/zsh) with standard utilities (curl, tar, grep, sed)

## Open Questions

None - curl-based installation follows well-established patterns from rustup, nvm, pyenv, and similar tools.
