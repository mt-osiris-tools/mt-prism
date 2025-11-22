# Tasks: Curl-Based Installation

**Input**: Design documents from `/specs/003-curl-install/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Shell scripts at repository root: `install.sh`
- Supporting scripts: `scripts/install/`
- Tests: `tests/install/unit/` and `tests/install/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create install script directory structure (scripts/install/, tests/install/)
- [ ] T002 Create main install.sh skeleton at repository root
- [ ] T003 [P] Add shellcheck configuration for code quality (.shellcheckrc)
- [ ] T004 [P] Setup Bats testing framework in package.json devDependencies
- [ ] T005 [P] Create GitHub Actions workflow .github/workflows/test-installer.yml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Implement platform detection in scripts/install/detect-platform.sh
- [ ] T007 Implement Node.js prerequisite checking in scripts/install/verify-prereqs.sh
- [ ] T008 [P] Implement GitHub Releases API client in scripts/install/download-release.sh
- [ ] T009 [P] Implement checksum verification utilities in scripts/install/verify-checksum.sh
- [ ] T010 [P] Create installation manifest writer in scripts/install/create-manifest.sh
- [ ] T011 Create error handling and cleanup logic (trap handlers) in install.sh
- [ ] T012 [P] Add logging/progress indicator utilities in scripts/install/logger.sh

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - One-Command Installation (Priority: P1) 🎯 MVP

**Goal**: Enable basic one-command installation via curl for developers with Node.js pre-installed

**Independent Test**: Run `curl -fsSL ... | sh` on clean Ubuntu VM, verify `prism --version` works

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Unit test for platform detection in tests/install/unit/detect-platform.test.sh
- [ ] T014 [P] [US1] Unit test for prerequisite checking in tests/install/unit/verify-prereqs.test.sh
- [ ] T015 [P] [US1] Unit test for download logic in tests/install/unit/download-release.test.sh
- [ ] T016 [P] [US1] Integration test for Ubuntu installation in tests/install/integration/test-ubuntu.sh
- [ ] T017 [P] [US1] Integration test for macOS installation in tests/install/integration/test-macos.sh

### Implementation for User Story 1

- [ ] T018 [US1] Implement main() function orchestrating install steps in install.sh
- [ ] T019 [US1] Implement download_release() using GitHub API in install.sh
- [ ] T020 [US1] Implement verify_and_extract() for checksum validation in install.sh
- [ ] T021 [US1] Implement install_dependencies() running npm install in install.sh
- [ ] T022 [US1] Implement configure_path() for shell profile updates in install.sh
- [ ] T023 [US1] Implement create_installation_manifest() writing ~/.mt-prism/install.json in install.sh
- [ ] T024 [US1] Implement verify_installation() running prism --version in install.sh
- [ ] T025 [US1] Add success message display with next steps in install.sh
- [ ] T026 [US1] Test complete P1 workflow on Ubuntu 22.04 Docker container
- [ ] T027 [US1] Test complete P1 workflow on macOS (via GitHub Actions or local)

**Checkpoint**: User Story 1 complete - users can now install MT-PRISM with one command

---

## Phase 4: User Story 2 - Automatic Configuration Setup (Priority: P2)

**Goal**: Auto-generate .env configuration file to reduce setup errors

**Independent Test**: Run install.sh, verify .env exists with template, existing .env preserved

### Implementation for User Story 2

- [ ] T028 [P] [US2] Implement .env detection logic in scripts/install/configure-env.sh
- [ ] T029 [P] [US2] Implement .env template copying from .env.example in scripts/install/configure-env.sh
- [ ] T030 [P] [US2] Add helpful comments to generated .env about required keys in scripts/install/configure-env.sh
- [ ] T031 [US2] Integrate configure_env() into main install flow in install.sh
- [ ] T032 [US2] Add test for .env creation in tests/install/unit/configure-env.test.sh
- [ ] T033 [US2] Add test for .env preservation in tests/install/unit/configure-env.test.sh
- [ ] T034 [US2] Test P2 workflow end-to-end on Docker

**Checkpoint**: User Story 2 complete - .env automatically configured on installation

---

## Phase 5: User Story 3 - Version and Update Management (Priority: P3)

**Goal**: Enable installing specific versions and updating existing installations

**Independent Test**: Install v1.0.0, then run update to v1.1.0, verify version changes correctly

### Implementation for User Story 3

- [ ] T035 [P] [US3] Implement --version flag parsing in install.sh
- [ ] T036 [P] [US3] Implement version-specific download from GitHub Releases in install.sh
- [ ] T037 [P] [US3] Implement existing installation detection via install.json in install.sh
- [ ] T038 [US3] Implement update prompt (update/reinstall/cancel options) in install.sh
- [ ] T039 [US3] Implement --update flag for automatic updates in install.sh
- [ ] T040 [US3] Implement preservation of .env and .prism/ during updates in install.sh
- [ ] T041 [US3] Implement --uninstall flag for clean removal in install.sh
- [ ] T042 [US3] Add version selection tests in tests/install/unit/version-management.test.sh
- [ ] T043 [US3] Add update workflow test in tests/install/integration/test-update.sh
- [ ] T044 [US3] Add uninstall test in tests/install/integration/test-uninstall.sh

**Checkpoint**: User Story 3 complete - full version management available

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and documentation

- [ ] T045 [P] Add --help flag with comprehensive usage documentation in install.sh
- [ ] T046 [P] Add --prefix flag for custom installation directory in install.sh
- [ ] T047 [P] Implement network retry logic (3 attempts with backoff) in scripts/install/download-release.sh
- [ ] T048 [P] Add rollback on failure (cleanup temp files, restore previous state) in install.sh
- [ ] T049 [P] Test edge cases: disk full, no internet, corrupted download in tests/install/integration/
- [ ] T050 [P] Add Windows/WSL compatibility testing in tests/install/integration/test-wsl.sh
- [ ] T051 Update README.md with curl install instructions
- [ ] T052 Create GitHub Pages redirect for https://install.mt-prism.dev (CNAME + index.html)
- [ ] T053 [P] Document GitHub Pages/CNAME setup process in docs/deployment/install-hosting.md
- [ ] T054 Test install script on all supported platforms (macOS Intel/ARM, Linux amd64/arm64, WSL)
- [ ] T055 Generate release checklist documenting required GitHub Release assets

---

## Dependencies

### User Story Dependency Graph

```
User Story 1 (One-Command Installation) - P1
  ↓ (independent)
User Story 2 (Auto Configuration) - P2
  ↓ (independent)
User Story 3 (Version Management) - P3
```

**All user stories are independent** - can be developed and delivered sequentially without blocking.

### Task Dependencies Within Stories

**US1 (T013-T027)**: Tests can run in parallel, implementation tasks are sequential
**US2 (T028-T034)**: All tasks can run in parallel except T031 (integration)
**US3 (T035-T044)**: Most tasks can run in parallel except sequential integration

---

## Parallel Execution Opportunities

### User Story 1 (P1)

Can run in parallel after T012 completes:
```
Group A: T013, T014, T015, T016, T017 (all tests)
Group B: T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025 (implementation chain)
Final: T026, T027 (integration tests after implementation)
```

### User Story 2 (P2)

Can run in parallel:
```
Group A: T028, T029, T030, T032, T033 (all parallel, different concerns)
Sequential: T031 (integration), T034 (e2e test)
```

### User Story 3 (P3)

Can run in parallel:
```
Group A: T035, T036, T037, T042 (parallel features)
Sequential: T038 → T039 → T040 → T041
Group B: T043, T044 (parallel tests after implementation)
```

### Polish Phase

All tasks (T045-T050) can run in parallel:
```
Group A: T045, T046, T047, T048, T049, T050 (all independent)
Sequential: T051 → T052 → T053 → T054 (documentation and release)
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Deliver ONLY User Story 1 (P1) first**:
- Enables core value: one-command installation
- Can be tested and validated independently
- Takes 3-4 hours to complete
- Delivers immediate user benefit

### Incremental Delivery

1. **Week 1**: User Story 1 (P1) - MVP release
2. **Week 2**: User Story 2 (P2) - Enhancement release
3. **Week 3**: User Story 3 (P3) - Feature complete
4. **Week 4**: Polish phase - Production ready

### Development Order

**DO NOT parallelize across user stories** - complete each story fully before starting the next:

1. Phase 1 (Setup): T001-T005
2. Phase 2 (Foundational): T006-T012
3. **CHECKPOINT** - Foundation complete
4. Phase 3 (US1 - MVP): T013-T027
5. **CHECKPOINT** - MVP testable
6. Phase 4 (US2): T028-T034
7. **CHECKPOINT** - Config automation working
8. Phase 5 (US3): T035-T044
9. **CHECKPOINT** - Version management complete
10. Phase 6 (Polish): T045-T055
11. **CHECKPOINT** - Production ready

---

## Task Count Summary

- **Setup**: 5 tasks
- **Foundational**: 7 tasks
- **User Story 1 (P1)**: 15 tasks (MVP)
- **User Story 2 (P2)**: 7 tasks
- **User Story 3 (P3)**: 10 tasks
- **Polish**: 11 tasks

**Total**: 55 tasks

**Parallel Opportunities**: ~40% of tasks can run in parallel within their phases

**Estimated Time**:
- MVP (Phases 1-3): 4-5 hours
- Full Feature: 8-10 hours

---

## Validation Checklist

Before marking feature complete:

- [ ] All 54 tasks completed
- [ ] Install script works on macOS (Intel + ARM)
- [ ] Install script works on Linux (Ubuntu + Alpine)
- [ ] Install script works on Windows/WSL
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] README updated with curl install instructions
- [ ] GitHub Release process documented
- [ ] Install script hosted and accessible via curl
- [ ] End-to-end test: Fresh machine to working prism command in <30 seconds
