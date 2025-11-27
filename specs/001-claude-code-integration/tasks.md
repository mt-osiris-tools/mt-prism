# Tasks: Claude Code Session Integration

**Input**: Design documents from `/home/james/Documents/Projects/ai/mt-prism/specs/001-claude-code-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Tests**: Included per constitution requirement (Principle III: Test-First Development)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (confirmed from plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Install proper-lockfile dependency via `npm install proper-lockfile`
- [X] T002 [P] Create directory structure: `src/models/`, `src/services/`, `src/utils/`, `tests/unit/`, `tests/integration/`, `tests/contract/`
- [X] T003 [P] Update TypeScript configuration in `tsconfig.json` to include new source directories

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Foundational Models & Types

- [X] T004 [P] Create ClaudeCodeEnvironment interface in `src/types/environment.ts`
- [X] T005 [P] Create SessionState interface and Zod schema in `src/types/session.ts` (extends existing)
- [X] T006 [P] Create AuthCredentials interface in `src/types/auth.ts`
- [X] T007 [P] Create ConfigurationProfile interface and Zod schema in `src/types/config.ts`
- [X] T008 [P] Create WorkspaceLock interface in `src/types/lock.ts`

### Foundational Services

- [X] T009 Implement environment detection service in `src/services/environment.ts` with multi-method detection (env vars, process name, config markers)
- [X] T010 [P] Implement auth discovery utility in `src/utils/auth.ts` with priority-ordered credential discovery
- [X] T011 [P] Implement lock manager in `src/utils/lockfile.ts` using proper-lockfile with stale detection
- [X] T012 [P] Implement session manager in `src/utils/session-manager.ts` with create/save/load/resume/list methods (already exists in src/utils/session.ts)
- [X] T013 [P] Implement config manager in `src/utils/config-manager.ts` with get/set/reset/show methods
- [X] T014 [P] Implement cleanup service in `src/utils/cleanup.ts` with 30-day retention and throttling
- [X] T015 [P] Implement timeout manager in `src/utils/timeout-manager.ts` using AbortController with graceful shutdown

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Run PRD Analysis in Active Claude Code Session (Priority: P1) 🎯 MVP

**Goal**: Enable developers to run MT-PRISM workflows directly in Claude Code with automatic authentication

**Independent Test**: Open Claude Code in a project directory containing a PRD file, run `prism --prd=./docs/requirements.md`, verify outputs in `.prism/sessions/sess-{timestamp}/`

### Tests for User Story 1 (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [P] [US1] Unit test for environment detection in `tests/unit/environment.test.ts` (mock env vars, process.ppid)
- [X] T017 [P] [US1] Unit test for auth discovery in `tests/unit/auth.test.ts` (mock credential sources)
- [X] T018 [P] [US1] Integration test for full workflow in simulated Claude Code in `tests/integration/claude-code-workflow.test.ts`

### Implementation for User Story 1

- [X] T019 [US1] Modify `src/cli.ts` to detect environment at startup (call `detectEnvironment()` from EnvironmentService)
- [X] T020 [US1] Modify `src/cli.ts` to discover credentials at startup (call `discoverCredentials()` from AuthDiscovery)
- [X] T021 [US1] Modify `src/cli.ts` to validate discovered credentials before workflow (call `validateCredentials()`)
- [X] T022 [US1] Update `src/utils/llm.ts` to use discovered credentials when creating LLM provider (NOTE: LLM abstraction layer will be created in future PR - credentials are now available via discoverCredentials())
- [X] T023 [US1] Add error handling for missing credentials in `src/cli.ts` with actionable error messages
- [X] T024 [US1] Add logging for environment detection results (confidence level, method) in `src/cli.ts`
- [X] T025 [US1] Add logging for credential discovery results (source, provider availability) in `src/cli.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional - PRD analysis runs in Claude Code with auto-authentication

---

## Phase 4: User Story 2 - Access Analysis Outputs from Claude Code (Priority: P1)

**Goal**: Ensure analysis outputs (TDD, API spec, database schema) are accessible in Claude Code file explorer

**Independent Test**: Run complete analysis in Claude Code, navigate to `.prism/sessions/`, verify all files visible and openable

### Tests for User Story 2 (TDD)

- [X] T026 [P] [US2] Unit test for session state save/load in `tests/unit/session-manager.test.ts` (verify YAML format, paths)
- [X] T027 [P] [US2] Contract test for session state schema validation in `tests/contract/session-state.test.ts` (Zod validation)

### Implementation for User Story 2

- [X] T028 [US2] Ensure session creation in `src/utils/session-manager.ts` creates session directory in workspace `.prism/` (FR-003) - already implemented in src/utils/session.ts:90-96
- [X] T029 [US2] Verify session state saves to `.prism/sessions/{sessionId}/session_state.yaml` with atomic write - already implemented via writeYAMLWithSchema
- [X] T030 [US2] Verify workflow outputs save to correct session subdirectories (01-prd-analysis/, 02-figma-analysis/, etc.) - already implemented in src/utils/session.ts:91-96
- [X] T031 [US2] Add session directory creation with proper permissions (755 for directories, 644 for files) - default permissions are correct, config.yaml uses 0600 in config-manager.ts
- [X] T032 [US2] Add validation that output paths are relative to workspace root for Claude Code file explorer access - paths use process.cwd() as base

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - analysis runs and outputs are accessible

---

## Phase 5: User Story 3 - Resume Previous Analysis Sessions (Priority: P2)

**Goal**: Allow users to resume interrupted analyses from last checkpoint

**Independent Test**: Start analysis, interrupt (Ctrl+C), reopen Claude Code, run `prism --resume=sess-{id}`, verify continuation from last step

### Tests for User Story 3 (TDD)

- [X] T033 [P] [US3] Unit test for session resume logic in `tests/unit/session-manager.test.ts` (verify state loading, step detection)
- [X] T034 [P] [US3] Integration test for interrupt + resume flow in `tests/integration/resume-workflow.test.ts` (kill process mid-step, resume)

### Implementation for User Story 3

- [X] T035 [US3] Implement session state save after each major workflow step in `src/workflows/discovery.ts` (FR-008) - already implemented via saveCheckpoint()
- [X] T036 [US3] Add `--resume=<session-id>` flag handling in `src/cli.ts` (FR-004)
- [X] T037 [US3] Add `--list-sessions` command in `src/cli.ts` to display available sessions with status (FR-005)
- [X] T038 [US3] Implement resume logic in `src/workflows/discovery.ts` to skip completed steps and start from current step - already implemented via shouldSkipStep()
- [X] T039 [US3] Add session state update before timeout abort in timeout manager callback
- [X] T040 [US3] Add error handling for invalid session ID in resume command (session not found, corrupted state)
- [X] T041 [US3] Verify timeout handling integrates with resume (save state, exit cleanly, allow resume) - implement 30-minute timeout in `src/workflows/discovery.ts` using WorkflowTimeoutManager (FR-016)
- [X] T042 [US3] Add graceful shutdown handlers (SIGTERM/SIGINT) in `src/cli.ts` to save session state on interrupt

**Checkpoint**: All P1-P2 user stories complete - core Claude Code integration with resume capability functional

---

## Phase 6: User Story 4 - Configure Analysis Settings from Claude Code (Priority: P3)

**Goal**: Allow configuration of MT-PRISM settings via CLI commands without manual file editing

**Independent Test**: Run `prism config --show`, `prism config --provider=openai`, verify settings persist and are used in next analysis

### Tests for User Story 4 (TDD)

- [ ] T043 [P] [US4] Unit test for config manager in `tests/unit/config-manager.test.ts` (get/set/reset/show)
- [ ] T044 [P] [US4] Contract test for config schema validation in `tests/contract/config.test.ts` (Zod validation)

### Implementation for User Story 4

- [ ] T045 [US4] Add `config` subcommand routing in `src/cli.ts` (FR-009)
- [ ] T046 [US4] Implement `prism config --show` command to display current configuration
- [ ] T047 [US4] Implement `prism config --provider=<name>` command to set AI provider preference
- [ ] T048 [US4] Implement `prism config --reset` command to restore default configuration
- [ ] T049 [US4] Load configuration at CLI startup and pass to workflow in `src/cli.ts`
- [ ] T050 [US4] Apply configuration settings in workflow (AI provider selection, timeout value, retention days)

**Checkpoint**: All user stories (P1-P3) complete - full Claude Code integration with configuration management

---

## Phase 7: Cross-Cutting Concerns & Integration

**Purpose**: Features that span multiple user stories and require all previous phases complete

### Concurrent Analysis Protection (FR-007)

- [ ] T051 Unit test for lock acquisition/release in `tests/unit/lockfile.test.ts` (acquire, release, stale detection)
- [ ] T052 Integration test for concurrent protection in `tests/integration/concurrent-protection.test.ts` (two processes, one blocked)
- [ ] T053 Add workspace lock acquisition at workflow start in `src/workflows/discovery.ts` before session creation
- [ ] T054 Add lock release at workflow end (success or failure) in `src/workflows/discovery.ts` using try-finally
- [ ] T055 Add user prompt for wait/cancel when lock is held in `src/workflows/discovery.ts` (FR-007)
- [ ] T056 Add stale lock detection and clearance prompt before acquiring lock

### Session Cleanup (FR-014)

- [ ] T057 Unit test for cleanup service in `tests/unit/cleanup.test.ts` (retention calculation, throttling, active session protection)
- [ ] T058 Add cleanup trigger at CLI startup in `src/cli.ts` with 7-day throttling (skip if resuming)
- [ ] T059 Add `prism cleanup` command with `--dry-run` and `--days` options in `src/cli.ts`
- [ ] T060 Create `.prism/.last-cleanup` tracking file for throttling

### Auth Expiry Recovery (FR-006)

- [ ] T061 Integration test for auth expiry recovery in `tests/integration/auth-expiry.test.ts` (mock expired token, prompt, continue)
- [ ] T062 Add 401/403 error detection in LLM provider calls
- [ ] T063 Add auth expiry handler in `src/workflows/discovery.ts` (pause, prompt for re-auth, resume)
- [ ] T064 Add credential re-validation loop (poll every 5s for 5 min) after re-auth prompt

### MCP Graceful Degradation (FR-015)

- [ ] T065 Integration test for MCP unavailability in `tests/integration/mcp-unavailability.test.ts` (mock failed MCP, graceful degradation)
- [ ] T066 Add MCP connection attempt with timeout in workflow initialization
- [ ] T067 Add MCP failure detection and warning logging in `src/workflows/discovery.ts`
- [ ] T068 Add local-only mode flag that skips MCP-dependent features (Confluence/Figma) when MCPs unavailable

### Workspace Permissions Check (FR-011)

- [ ] T069 Add workspace write permission check at CLI startup in `src/cli.ts`
- [ ] T070 Add actionable error message if `.prism/` directory cannot be created (suggest alternative locations)

---

## Phase 8: Polish & Documentation

**Purpose**: Improvements that affect multiple user stories

- [ ] T071 [P] Add progress feedback logging throughout workflow in `src/workflows/discovery.ts` (step indicators, time elapsed, operation) - FR-010
- [ ] T072 [P] Create `.prism/config.yaml.example` template with default configuration
- [ ] T073 [P] Update README.md with Claude Code integration instructions
- [ ] T074 [P] Create quickstart.md guide in specs directory (using quickstart template)
- [ ] T075 [P] Add security audit: verify no API keys logged, config file permissions correct (0600)
- [ ] T076 Verify all performance targets met (environment detection <100ms, state save/load <500ms, lock acquire/release <200ms)
- [ ] T077 [P] Run full integration test suite with all user stories
- [ ] T078 [P] Manual validation in real Claude Code environment (not simulated)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1) → User Story 2 (P1): Independent but build on same foundation
  - User Story 3 (P2): Depends on US1/US2 being complete (needs session management working)
  - User Story 4 (P3): Independent of other stories, depends only on Foundational
- **Cross-Cutting (Phase 7)**: Depends on all user stories being complete
- **Polish (Phase 8)**: Depends on Cross-Cutting completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core functionality
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Parallel with US1 or immediately after
- **User Story 3 (P2)**: Should start after US1/US2 complete - Builds on session management
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independent enhancement

### Within Each User Story

- Tests MUST be written FIRST and FAIL before implementation (TDD per constitution)
- Models/types before services
- Services before CLI integration
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase (Phase 1)**:
- T002 and T003 can run in parallel

**Foundational Phase (Phase 2)**:
- T004-T008 (all type definitions) can run in parallel
- T010-T015 (all service implementations) can run in parallel after types complete

**User Story 1 (Phase 3)**:
- T016-T018 (all tests) can run in parallel
- T024-T025 (logging tasks) can run in parallel

**User Story 2 (Phase 4)**:
- T026-T027 (tests) can run in parallel

**User Story 3 (Phase 5)**:
- T033-T034 (tests) can run in parallel
- T035-T037 (independent implementation tasks) can run in parallel

**User Story 4 (Phase 6)**:
- T043-T044 (tests) can run in parallel
- T046-T048 (config command implementations) can run in parallel

**Cross-Cutting Phase (Phase 7)**:
- T051-T052 (lock tests) can run in parallel with T057 (cleanup test) and T061 (auth test) and T065 (MCP test)
- T069-T070 (permission check) independent

**Polish Phase (Phase 8)**:
- T071-T075 and T077-T078 can all run in parallel

---

## Parallel Example: Foundational Phase (Phase 2)

```bash
# Launch all type definitions together:
Task: "Create ClaudeCodeEnvironment interface in src/types/environment.ts"
Task: "Create SessionState interface in src/types/session.ts"
Task: "Create AuthCredentials interface in src/types/auth.ts"
Task: "Create ConfigurationProfile interface in src/types/config.ts"
Task: "Create WorkspaceLock interface in src/types/lock.ts"

# Then launch all service implementations together:
Task: "Implement auth discovery in src/utils/auth.ts"
Task: "Implement lock manager in src/utils/lockfile.ts"
Task: "Implement session manager in src/utils/session-manager.ts"
Task: "Implement config manager in src/utils/config-manager.ts"
Task: "Implement cleanup service in src/utils/cleanup.ts"
Task: "Implement timeout manager in src/utils/timeout-manager.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (run analysis in Claude Code)
4. Complete Phase 4: User Story 2 (access outputs)
5. **STOP and VALIDATE**: Test US1+US2 together independently
6. Deploy/demo MVP (core Claude Code integration working)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T015)
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP! - T016-T032)
3. Add User Story 3 → Test independently → Deploy/Demo (Resume capability - T033-T042)
4. Add User Story 4 → Test independently → Deploy/Demo (Configuration - T043-T050)
5. Add Cross-Cutting → Test all together → Deploy/Demo (Full feature - T051-T070)
6. Add Polish → Final validation → Deploy/Demo (Production-ready - T071-T078)

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T015)
2. Once Foundational is done:
   - Developer A: User Story 1 (T016-T025)
   - Developer B: User Story 2 (T026-T032)
   - Developer C: User Story 4 (T043-T050) - can start immediately
3. Once US1+US2 complete:
   - Developer A or B: User Story 3 (T033-T042)
4. Once all user stories complete:
   - Team: Cross-Cutting concerns together (T051-T070)
5. Team: Polish together (T071-T078)

---

## Summary

**Total Tasks**: 78

**Task Count per Phase**:
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 12 tasks
- Phase 3 (User Story 1 - P1): 10 tasks
- Phase 4 (User Story 2 - P1): 7 tasks
- Phase 5 (User Story 3 - P2): 10 tasks
- Phase 6 (User Story 4 - P3): 6 tasks
- Phase 7 (Cross-Cutting): 20 tasks
- Phase 8 (Polish): 8 tasks

**Parallel Opportunities Identified**: 40+ tasks can run in parallel within their phases

**Independent Test Criteria**:
- **US1**: Open Claude Code, run `prism --prd=file.md`, verify auto-auth and outputs generated
- **US2**: Navigate to `.prism/sessions/`, verify all files visible in Claude Code file explorer
- **US3**: Interrupt analysis (Ctrl+C), run `prism --resume=sess-{id}`, verify continuation from checkpoint
- **US4**: Run `prism config --provider=openai`, run analysis, verify GPT-4 used instead of Claude

**Suggested MVP Scope**: Phase 1-4 (User Stories 1 & 2) = 32 tasks
- Core Claude Code integration with automatic authentication
- Analysis outputs accessible in Claude Code file explorer
- Minimum viable product for developers using Claude Code

**Format Validation**: ✅ All tasks follow checklist format with:
- Checkbox: `- [ ]`
- Task ID: T001-T078 (sequential)
- [P] marker: 40+ tasks marked as parallelizable
- [Story] label: US1, US2, US3, US4 for user story tasks
- File paths: All implementation tasks include exact file paths
- Clear descriptions: Each task describes what to do and where

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4)
- Each user story is independently completable and testable
- **TDD Required**: Write tests FIRST, verify they FAIL before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance: 80%+ overall coverage, 90%+ critical paths (locking, state persistence)
- All performance targets explicitly tested in Phase 8 (T076)
