# Implementation Plan: Claude Code Session Integration

**Branch**: `001-claude-code-integration` | **Date**: 2025-11-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-claude-code-integration/spec.md`

## Summary

Enable MT-PRISM to run natively within Claude Code sessions, allowing developers to execute PRD-to-TDD workflows without leaving their development environment. The system will detect Claude Code execution context, automatically use session credentials, manage concurrent analyses with lock files, handle session persistence/resume, and degrade gracefully when external services are unavailable. Core technical approach involves environment detection, credential discovery, filesystem-based state management, and robust error recovery with a 30-minute workflow timeout.

## Technical Context

**Language/Version**: TypeScript 5.9+ (Node.js 20+, already established in project)
**Primary Dependencies**: @anthropic-ai/sdk, dotenv, yaml, zod (existing), plus new: proper-lockfile (file locking)
**Storage**: Local filesystem (`.prism/` directory for sessions, config, metrics)
**Testing**: Vitest (existing), plus new integration tests for Claude Code environment
**Target Platform**: Cross-platform CLI (Linux, macOS, Windows) running in Claude Code or standalone terminal
**Project Type**: Single project (TypeScript CLI tool with skill-based architecture)
**Performance Goals**:
- Environment detection: < 100ms
- Session state save/load: < 500ms
- Lock acquire/release: < 200ms
- Resume from saved state: < 30 seconds to first resumed operation
- Full workflow timeout: 30 minutes maximum
**Constraints**:
- Must work offline except for AI API calls and optional MCP integrations
- Zero additional infrastructure (no servers, databases, containers)
- Must preserve existing MT-PRISM architecture (5 skills, MCP-based integrations)
- Authentication discovery must not require user action when in Claude Code
**Scale/Scope**:
- Support 10+ concurrent workspaces (different projects, same machine)
- Handle 30 days of session history per workspace (auto-cleanup)
- Manage up to 100 configuration keys
- Support all existing MT-PRISM workflows without modification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Skill-First Architecture
✅ **PASS** - This feature enhances the existing skill architecture without adding new skills. Environment detection, session management, and locking are infrastructure utilities that support all five existing skills (PRD Analyzer, Figma Analyzer, Validator, Clarifier, TDD Generator). No complex infrastructure introduced.

### Principle II: Document-Driven Discovery
✅ **PASS** - Feature does not alter document-driven workflow. PRD and Figma analysis remain the entry points. This feature only changes *where* and *how* workflows execute (Claude Code vs. standalone), not the workflow structure itself.

### Principle III: Test-First Development
✅ **PASS** - All new components (environment detection, lock manager, session manager, auth discovery) will be developed with TDD. Target: 80%+ overall coverage, 90%+ for critical paths (locking, state persistence). Integration tests will validate Claude Code-specific behavior.

### Principle IV: Iterative Clarification
✅ **PASS** - Feature does not impact clarification workflow. Clarification Manager skill continues to operate identically whether in Claude Code or standalone mode.

### Principle V: Progressive Enhancement
✅ **PASS** - Feature is independently valuable: developers can use MT-PRISM in Claude Code *today* with existing skills. Implementation order follows progressive enhancement:
- Phase 1: Environment detection + basic execution (MVP)
- Phase 2: Session persistence + resume
- Phase 3: Lock management + concurrent protection
- Phase 4: Configuration management + cleanup

### Principle VI: Observable Operations
✅ **PASS** - Enhanced observability through:
- Environment detection logged at startup
- Session lifecycle events (create, save, resume, cleanup) logged
- Lock acquisition/release logged
- Auth discovery attempts logged
All logs follow existing `.prism/metrics.jsonl` format.

### Principle VII: MCP-Based Integration
✅ **PASS** - Feature leverages existing MCP architecture. No new MCP servers required. Graceful degradation (FR-015) when MCPs unavailable aligns with MCP-based integration principle.

### Principle VIII: LLM Provider Abstraction
✅ **PASS** - Feature does not interact with LLM providers directly. All LLM calls continue through existing abstraction layer (`src/utils/llm.ts`). Claude Code auth discovery may provide credentials, but abstraction layer remains the sole interface to AI providers.

**Quality Gates**:
- Analysis Gate: N/A (not adding new analyzers)
- Validation Gate: N/A (not modifying validator)
- Clarification Gate: N/A (not modifying clarifier)
- TDD Generation Gate: N/A (not modifying TDD generator)
- Acceptance Gate: Feature must not break existing workflow success criteria

**Verdict**: ✅ **ALL GATES PASS** - Feature is fully compliant with constitution. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-claude-code-integration/
├── spec.md              # Feature specification (COMPLETE)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   ├── environment.schema.json
│   ├── session-state.schema.json
│   ├── lock-file.schema.json
│   └── config.schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── models/                    # Existing
│   └── session.ts             # NEW: Session state models
├── services/                  # Existing
│   └── environment.ts         # NEW: Environment detection service
├── utils/                     # Existing
│   ├── llm.ts                 # Existing: LLM abstraction
│   ├── auth.ts                # NEW: Auth discovery (Claude Code + .env)
│   ├── lockfile.ts            # NEW: Lock file management
│   ├── session-manager.ts     # NEW: Session CRUD + resume
│   ├── config-manager.ts      # NEW: Configuration management
│   └── cleanup.ts             # NEW: Session cleanup (30-day retention)
├── cli.ts                     # MODIFY: Add environment detection at startup
└── workflows/
    └── discovery.ts           # MODIFY: Integrate session management, locking, timeout

tests/
├── unit/
│   ├── environment.test.ts    # NEW: Environment detection tests
│   ├── auth.test.ts           # NEW: Auth discovery tests
│   ├── lockfile.test.ts       # NEW: Lock manager tests
│   ├── session-manager.test.ts # NEW: Session manager tests
│   ├── config-manager.test.ts # NEW: Config manager tests
│   └── cleanup.test.ts        # NEW: Cleanup logic tests
├── integration/
│   ├── claude-code-workflow.test.ts  # NEW: Full workflow in simulated Claude Code
│   ├── resume-workflow.test.ts       # NEW: Interrupt + resume flow
│   └── concurrent-protection.test.ts # NEW: Lock file behavior
└── contract/                  # Existing
    └── session-state.test.ts  # NEW: Session state schema validation

.prism/                        # User data directory (gitignored)
├── sessions/
│   └── sess-{timestamp}/
│       ├── session_state.yaml # NEW: Resume-able state
│       ├── 01-prd-analysis/
│       ├── 02-figma-analysis/
│       ├── 03-validation/
│       ├── 04-clarification/
│       └── 05-tdd/
├── config.yaml                # NEW: User configuration
├── .lock                      # NEW: Workspace lock file
└── metrics.jsonl              # Existing: Workflow metrics
```

**Structure Decision**: Single project structure selected (Option 1 from template). MT-PRISM is a unified CLI tool, not a web/mobile app. New utilities (`auth.ts`, `lockfile.ts`, `session-manager.ts`, `config-manager.ts`, `cleanup.ts`) added to `src/utils/` alongside existing utilities. New service (`environment.ts`) added to `src/services/`. Session models added to `src/models/`. Testing structure mirrors source structure with unit, integration, and contract tests.

## Complexity Tracking

> **No constitution violations** - Table intentionally left empty per template instructions.

---

## Phase 0: Research & Unknowns Resolution

**Objective**: Resolve all NEEDS CLARIFICATION items and establish best practices for implementation.

### Research Tasks

1. **Claude Code Environment Detection**
   - **Unknown**: How to programmatically detect when code is running in Claude Code vs. standalone terminal
   - **Research Goal**: Identify environment variables, process attributes, or filesystem markers
   - **Deliverable**: Document reliable detection method with 100% accuracy

2. **Claude Code Authentication Discovery**
   - **Unknown**: How Claude Code stores and exposes authentication credentials for child processes
   - **Research Goal**: Locate credential storage (env vars, config files, OS keychain) and access methods
   - **Deliverable**: Document credential discovery strategy with fallback to `.env`

3. **Lock File Best Practices**
   - **Unknown**: Best practices for file locking in Node.js (stale lock detection, cross-platform compatibility)
   - **Research Goal**: Evaluate libraries (proper-lockfile, lockfile, fs-ext) and patterns
   - **Deliverable**: Select lock library and document stale lock detection strategy

4. **Session State Persistence Format**
   - **Unknown**: Optimal format for resumable session state (JSON vs YAML vs custom binary)
   - **Research Goal**: Balance human-readability, size, and parsing performance
   - **Deliverable**: Select format (likely YAML for consistency) and document schema

5. **Timeout Implementation Strategy**
   - **Unknown**: Best way to enforce 30-minute timeout across async workflow steps
   - **Research Goal**: Evaluate AbortController, setTimeout, promise timeouts, workflow orchestration
   - **Deliverable**: Select approach that allows graceful state saving before termination

6. **Session Cleanup Scheduling**
   - **Unknown**: When to trigger 30-day cleanup (on startup, background, on-demand)
   - **Research Goal**: Balance resource usage vs. timely cleanup
   - **Deliverable**: Select triggering strategy (likely on startup + on-demand)

### Output

All research findings will be consolidated in `research.md` with format:
- **Decision**: [selected approach]
- **Rationale**: [why chosen]
- **Alternatives Considered**: [what else evaluated]
- **Implementation Notes**: [key details for Phase 1]

---

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete with all unknowns resolved

### Data Model Design (`data-model.md`)

Based on feature spec (FR-001 through FR-016) and Key Entities:

1. **ClaudeCodeEnvironment**
   - `isClaudeCode: boolean` - Detection result
   - `workspacePath: string` - Current working directory
   - `authAvailable: boolean` - Whether Claude Code auth discovered
   - `mcpServers: string[]` - Available MCP servers
   - `detectedAt: Date` - When environment was detected

2. **SessionState** (FR-008, US-3)
   - `sessionId: string` - Unique identifier (sess-{timestamp})
   - `createdAt: Date` - Session creation time
   - `updatedAt: Date` - Last state save time
   - `status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted'`
   - `currentStep: 'prd-analysis' | 'figma-analysis' | 'validation' | 'clarification' | 'tdd-generation'`
   - `progress: { stepName: string, completed: boolean, startedAt?: Date, completedAt?: Date }[]`
   - `prdSource: string` - Original PRD path/URL
   - `figmaSource?: string` - Original Figma file ID
   - `projectName?: string` - User-provided project name
   - `outputs: { tddPath?: string, apiSpecPath?: string, databaseSchemaPath?: string }`
   - `error?: { message: string, step: string, timestamp: Date }`

3. **WorkspaceLock** (FR-007)
   - `workspacePath: string` - Path being locked
   - `sessionId: string` - Session holding the lock
   - `pid: number` - Process ID holding lock
   - `acquiredAt: Date` - When lock was acquired
   - `expiresAt: Date` - Stale lock threshold (2x timeout = 60 min)

4. **ConfigurationProfile** (FR-009, US-4)
   - `version: string` - Config schema version
   - `llm: { provider: string, model?: string, temperature?: number }`
   - `mcps: { confluence?: object, figma?: object, jira?: object, slack?: object }`
   - `workflow: { clarificationMode?: string, maxClarificationIterations?: number }`
   - `output: { baseDirectory?: string, format?: string, includeDiagrams?: boolean }`
   - `retention: { sessionDays: number }` - Default 30

5. **AuthCredentials**
   - `source: 'claude-code' | 'env-file' | 'not-found'`
   - `anthropicApiKey?: string`
   - `openaiApiKey?: string`
   - `googleApiKey?: string`
   - `discoveredAt: Date`

### API Contracts (`contracts/`)

**Note**: This is a CLI tool, not a REST API. "Contracts" here refer to data schemas and service interfaces.

1. **environment.schema.json** - ClaudeCodeEnvironment JSON Schema (Zod schema in code)
2. **session-state.schema.json** - SessionState YAML schema (Zod schema in code)
3. **lock-file.schema.json** - WorkspaceLock internal format
4. **config.schema.json** - ConfigurationProfile YAML schema (Zod schema in code)

### Service Interfaces

**EnvironmentService** (`src/services/environment.ts`):
```typescript
interface EnvironmentService {
  detect(): Promise<ClaudeCodeEnvironment>
  isClaudeCode(): boolean
  getWorkspacePath(): string
  getMCPServers(): string[]
}
```

**AuthDiscovery** (`src/utils/auth.ts`):
```typescript
interface AuthDiscovery {
  discoverCredentials(): Promise<AuthCredentials>
  validateCredentials(creds: AuthCredentials): Promise<boolean>
}
```

**LockManager** (`src/utils/lockfile.ts`):
```typescript
interface LockManager {
  acquire(workspacePath: string, sessionId: string): Promise<boolean>
  release(workspacePath: string): Promise<void>
  isLocked(workspacePath: string): Promise<boolean>
  detectStaleLock(workspacePath: string): Promise<boolean>
  clearStaleLock(workspacePath: string): Promise<void>
  waitForRelease(workspacePath: string, timeout: number): Promise<void>
}
```

**SessionManager** (`src/utils/session-manager.ts`):
```typescript
interface SessionManager {
  createSession(prdSource: string, options: CreateSessionOptions): Promise<SessionState>
  saveState(session: SessionState): Promise<void>
  loadState(sessionId: string): Promise<SessionState>
  listSessions(filter?: 'all' | 'incomplete' | 'completed'): Promise<SessionState[]>
  resumeSession(sessionId: string): Promise<SessionState>
  completeSession(sessionId: string, outputs: SessionOutputs): Promise<void>
  failSession(sessionId: string, error: Error): Promise<void>
}
```

**ConfigManager** (`src/utils/config-manager.ts`):
```typescript
interface ConfigManager {
  load(): Promise<ConfigurationProfile>
  save(config: ConfigurationProfile): Promise<void>
  get<T>(key: string): T | undefined
  set(key: string, value: any): Promise<void>
  reset(): Promise<void>
  show(): string // Human-readable config display
}
```

**CleanupService** (`src/utils/cleanup.ts`):
```typescript
interface CleanupService {
  cleanupOldSessions(retentionDays: number): Promise<{ removed: number, errors: number }>
  shouldTriggerCleanup(): boolean // Check if cleanup due
}
```

### Workflow Integration Points

**CLI Startup** (`src/cli.ts`):
- Detect environment (Claude Code vs. standalone)
- Discover auth credentials (Claude Code session or .env)
- Load configuration
- Check for stale locks
- Trigger cleanup if due (last cleanup > 7 days)

**Discovery Workflow** (`src/workflows/discovery.ts`):
- Acquire workspace lock (with wait/cancel prompt if locked)
- Create or resume session
- Set 30-minute timeout with AbortSignal
- Save state after each major step
- Handle auth expiry (pause, prompt, resume)
- Handle MCP unavailability (warn, degrade gracefully)
- Release lock on completion/failure
- Handle timeout (save state, fail gracefully)

### Testing Strategy

**Unit Tests** (90%+ coverage for new code):
- Environment detection with mocked env vars
- Auth discovery with mocked credential sources
- Lock acquire/release/stale detection
- Session create/save/load/resume
- Config get/set/reset
- Cleanup logic with mocked filesystem

**Integration Tests** (80%+ coverage):
- Full workflow in simulated Claude Code (env vars set)
- Interrupt + resume flow (kill process mid-step, resume)
- Concurrent protection (two processes, one blocked)
- Auth expiry recovery (mock expired token, prompt, continue)
- MCP unavailability (mock failed MCP, graceful degradation)
- Timeout enforcement (slow mock operations, timeout trigger)

**Contract Tests**:
- Session state schema validation (Zod)
- Config schema validation (Zod)
- Lock file format validation

### Quickstart Guide (`quickstart.md`)

1. **For Developers Using Claude Code**:
   - Open project in Claude Code
   - Ensure authenticated (`claude login` if needed)
   - Run `prism --prd=./docs/requirements.md`
   - System auto-detects environment and uses Claude Code auth
   - Outputs appear in `.prism/sessions/sess-{timestamp}/`

2. **For Developers Using Standalone Terminal**:
   - Create `.env` file with API keys
   - Run `prism --prd=./docs/requirements.md`
   - System falls back to .env credentials
   - Outputs appear in `.prism/sessions/sess-{timestamp}/`

3. **Resuming Interrupted Analysis**:
   - List available sessions: `prism --list-sessions`
   - Resume specific session: `prism --resume=sess-1234567890`
   - System continues from last saved step

4. **Configuration**:
   - View config: `prism config --show`
   - Change AI provider: `prism config --provider=openai`
   - Reset to defaults: `prism config --reset`

5. **Troubleshooting**:
   - Lock file stuck: `rm .prism/.lock` (or restart, auto-clears stale locks)
   - Auth expired: Run `claude login` and retry
   - MCP unavailable: Use local files instead of Confluence/Figma URLs

---

## Phase 2: Task Generation

**Output**: Dependency-ordered task list in `tasks.md` (generated by `/speckit.tasks` command, NOT by this plan)

**Agent Context Update**: Run `.specify/scripts/bash/update-agent-context.sh claude` after Phase 1 to add:
- New dependencies: proper-lockfile
- New concepts: Environment detection, session persistence, lock management, auth discovery
- New testing patterns: Simulated Claude Code environment, interrupt/resume flows

---

## Implementation Notes

### Critical Path Dependencies

1. Environment detection MUST complete before auth discovery
2. Auth discovery MUST complete before any LLM calls
3. Lock acquisition MUST complete before session creation
4. Session creation MUST complete before workflow starts
5. State saves MUST be atomic (write to temp file, then rename)
6. Cleanup MUST not delete sessions with active locks

### Error Handling Strategy

**FR-006 (Auth Expiry)**:
- Detect 401/403 from LLM API
- Pause workflow execution (no new LLM calls)
- Prompt user: "Claude Code authentication expired. Please run: claude login"
- Poll for credential restoration (check every 5s for 5 min)
- If restored: resume workflow from paused step
- If timeout: save state, exit with resume instructions

**FR-007 (Concurrent Analysis)**:
- Attempt lock acquisition
- If locked: check lock age
  - If fresh (< 60 min): prompt "Analysis in progress. (W)ait or (C)ancel?"
  - If stale (> 60 min): prompt "Stale lock detected. (C)lear lock or (C)ancel?"
- If wait: poll lock release every 10s
- If cancel: exit cleanly (no state saved)

**FR-015 (MCP Unavailability)**:
- Attempt MCP connection
- If fails: log warning "MCP server [name] unavailable"
- Check if PRD/Figma source requires MCP
  - If yes: prompt "Cannot access [source] without MCP. Use local file instead? (Y/N)"
  - If no: continue in local-only mode

**FR-016 (Timeout)**:
- Start 30-minute timer on workflow start
- Pass AbortSignal through all async operations
- On timeout: trigger AbortSignal
- Each step checks signal before proceeding
- On abort: save current state, log timeout event, exit with resume instructions

### Performance Optimizations

- Environment detection cached in-memory for session duration
- Config loaded once at startup, cached
- Session state saved incrementally (not full rewrite each time)
- Lock checks use fast filesystem stat (not full file read)
- Cleanup triggered max once per day (tracked in `.prism/.last-cleanup`)

### Security Considerations

- Never log API keys (even from env vars)
- Lock file contains no sensitive data (only session ID, PID)
- Session state contains no API keys (only PRD/Figma sources, which may be URLs)
- Config file permissions: 0600 (user read/write only)
- Credential discovery never writes discovered credentials to disk

---

## Success Criteria Validation

Mapping success criteria (SC-001 through SC-008) to implementation:

- **SC-001** (Complete analysis in Claude Code): ✅ Environment detection + auth discovery enables this
- **SC-002** (95% success rate without auth errors): ✅ Auth discovery with fallback + expiry recovery handles this
- **SC-003** (Resume in < 30 seconds): ✅ Session manager with incremental state saves enables this
- **SC-004** (≤ 5 min work lost): ✅ Save state after each major step (5 steps, ~4 min each = ≤ 4 min loss)
- **SC-005** (Outputs accessible in < 2 seconds): ✅ Local filesystem writes, no special optimizations needed
- **SC-006** (Config persists): ✅ Config manager with YAML persistence
- **SC-007** (90% first-run success): ✅ Auto-detection + clear error messages + graceful degradation
- **SC-008** (95% < 20 min, timeout at 30 min): ✅ Timeout enforcement with saved state + resume

---

## Next Steps

1. **Execute Phase 0**: Run research agents to resolve all unknowns, produce `research.md`
2. **Execute Phase 1**: Generate `data-model.md`, `contracts/`, `quickstart.md` based on research
3. **Update Agent Context**: Run `.specify/scripts/bash/update-agent-context.sh claude`
4. **Generate Tasks**: Run `/speckit.tasks` to produce dependency-ordered task list
5. **Begin Implementation**: Follow TDD approach for each task in `tasks.md`
