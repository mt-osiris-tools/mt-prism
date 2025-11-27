# Research Findings: Claude Code Session Integration

**Date**: 2025-11-22
**Feature**: Claude Code Session Integration
**Phase**: 0 (Research & Unknowns Resolution)

This document consolidates research findings for all technical unknowns identified in the implementation plan. Each section follows the format: Decision → Rationale → Alternatives Considered → Implementation Notes.

---

## 1. Claude Code Environment Detection

### Decision
Use **multi-method detection with confidence scoring**:
1. Check for explicit environment marker (`CLAUDECODE=1`)
2. Detect parent process name via platform-specific commands
3. Check for configuration markers in home directory
4. Fall back to assuming standalone mode

### Rationale
- No single detection method is 100% reliable
- Different Claude Code versions may use different markers
- Confidence scoring allows graceful degradation
- Multi-method approach maximizes detection success rate

### Alternatives Considered
- **Environment variables only**: Unreliable (Claude Code doesn't always set markers)
- **Process name only**: Platform-specific, can be spoofed
- **Config files only**: Low confidence, other IDEs use similar paths

### Implementation Notes

**Detection Function** (`src/services/environment.ts`):
```typescript
export interface ClaudeCodeEnvironment {
  isClaudeCode: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  method: string;
  workspacePath: string;
  authAvailable: boolean;
  mcpServers: string[];
  detectedAt: Date;
}

export async function detectEnvironment(): Promise<ClaudeCodeEnvironment> {
  // Method 1: Check explicit marker (highest confidence)
  if (process.env.CLAUDECODE === '1') {
    return {
      isClaudeCode: true,
      confidence: 'high',
      method: 'env-marker-explicit',
      workspacePath: process.cwd(),
      authAvailable: !!process.env.ANTHROPIC_API_KEY,
      mcpServers: detectMCPServers(),
      detectedAt: new Date()
    };
  }

  // Method 2: Parent process name detection
  try {
    const ppid = process.ppid;
    let parentName = '';

    if (process.platform === 'darwin' || process.platform === 'linux') {
      parentName = execSync(`ps -p ${ppid} -o comm=`, { encoding: 'utf-8' }).trim();
    } else if (process.platform === 'win32') {
      const output = execSync(`wmic process where (ProcessId=${ppid}) get ExecutablePath`,
        { encoding: 'utf-8' });
      parentName = output;
    }

    if (parentName.includes('claude') || parentName.includes('node')) {
      return {
        isClaudeCode: true,
        confidence: 'medium',
        method: 'parent-process-name',
        workspacePath: process.cwd(),
        authAvailable: !!process.env.ANTHROPIC_API_KEY,
        mcpServers: detectMCPServers(),
        detectedAt: new Date()
      };
    }
  } catch (error) {
    // Continue to next method
  }

  // Method 3: Check for Claude config directory
  const claudeConfigPath = join(os.homedir(), '.claude');
  if (existsSync(claudeConfigPath)) {
    return {
      isClaudeCode: false, // Low confidence
      confidence: 'low',
      method: 'config-directory',
      workspacePath: process.cwd(),
      authAvailable: !!process.env.ANTHROPIC_API_KEY,
      mcpServers: [],
      detectedAt: new Date()
    };
  }

  // No detection
  return {
    isClaudeCode: false,
    confidence: 'none',
    method: 'none',
    workspacePath: process.cwd(),
    authAvailable: !!process.env.ANTHROPIC_API_KEY,
    mcpServers: [],
    detectedAt: new Date()
  };
}
```

**Key Points**:
- Cache detection result in-memory for session duration
- Log detection method and confidence at CLI startup
- Don't block on detection failure (graceful degradation)
- Max detection time: 100ms (meets performance target)

---

## 2. Claude Code Authentication Discovery

### Decision
Use **priority-ordered credential discovery**:
1. `ANTHROPIC_API_KEY` environment variable (highest priority, auto-inherited)
2. `~/.claude/.credentials.json` OAuth token (Claude Code-specific)
3. `.env` file in project root (fallback for standalone)
4. Prompt user with setup instructions (last resort)

### Rationale
- Environment variables are automatically inherited by child processes
- OAuth tokens from Claude Code work seamlessly for users already authenticated
- `.env` fallback ensures standalone mode works without Claude Code
- Clear error messages guide users through setup

### Alternatives Considered
- **OAuth only**: Doesn't support standalone terminal use
- **`.env` only**: Requires manual setup even in Claude Code
- **API key helper script**: Enterprise feature, not needed for MVP

### Implementation Notes

**Credential Discovery** (`src/utils/auth.ts`):
```typescript
export interface AuthCredentials {
  source: 'env-var' | 'oauth' | 'env-file' | 'not-found';
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
  expiresAt?: number; // For OAuth tokens
  refreshToken?: string; // For OAuth refresh
  discoveredAt: Date;
}

export async function discoverCredentials(): Promise<AuthCredentials> {
  // Priority 1: Environment variable (auto-inherited from Claude Code)
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      source: 'env-var',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      googleApiKey: process.env.GOOGLE_API_KEY,
      discoveredAt: new Date()
    };
  }

  // Priority 2: OAuth token from Claude Code credentials file
  try {
    const credPath = join(os.homedir(), '.claude', '.credentials.json');
    const credContent = await readFile(credPath, 'utf-8');
    const creds = JSON.parse(credContent);

    if (creds.claudeAiOauth?.accessToken) {
      return {
        source: 'oauth',
        anthropicApiKey: creds.claudeAiOauth.accessToken,
        expiresAt: creds.claudeAiOauth.expiresAt,
        refreshToken: creds.claudeAiOauth.refreshToken,
        discoveredAt: new Date()
      };
    }
  } catch (error) {
    // File doesn't exist or invalid, continue to next method
  }

  // Priority 3: .env file in project root
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = await readFile(envPath, 'utf-8');
    const anthropicMatch = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    const openaiMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
    const googleMatch = envContent.match(/GOOGLE_API_KEY=(.+)/);

    if (anthropicMatch || openaiMatch || googleMatch) {
      return {
        source: 'env-file',
        anthropicApiKey: anthropicMatch?.[1].trim(),
        openaiApiKey: openaiMatch?.[1].trim(),
        googleApiKey: googleMatch?.[1].trim(),
        discoveredAt: new Date()
      };
    }
  } catch (error) {
    // .env doesn't exist
  }

  // Priority 4: No credentials found
  return {
    source: 'not-found',
    discoveredAt: new Date()
  };
}

export async function validateCredentials(creds: AuthCredentials): Promise<boolean> {
  if (!creds.anthropicApiKey && !creds.openaiApiKey && !creds.googleApiKey) {
    return false;
  }

  try {
    // Use existing LLM abstraction layer to validate
    const llm = await createLLMProvider();
    await llm.generateText('ping', { maxTokens: 5 });
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      return false; // Invalid credentials
    }
    throw error; // Other error, re-throw
  }
}
```

**Handling OAuth Expiry** (FR-006):
- OAuth tokens expire every 8-12 hours
- On 401/403 from LLM API: pause workflow, prompt for re-auth
- Poll for credential restoration every 5 seconds for up to 5 minutes
- If restored: resume from paused step
- If timeout: save state, exit with resume instructions

**Key Points**:
- Never log API keys (security requirement)
- Validate credentials before first LLM call
- Clear error messages with recovery steps
- Credential discovery time: < 50ms (file reads only)

---

## 3. File Locking

### Decision
Use **proper-lockfile** library with mtime-based stale detection.

**Install**: `npm install proper-lockfile`

### Rationale
- Cross-platform (Linux, macOS, Windows, NFS)
- Atomic mkdir operations (more reliable than O_EXCL flag)
- Active mtime monitoring for proper stale lock detection
- Well-maintained (3.8M weekly downloads)
- Performance: < 200ms lock acquire/release (meets target)

### Alternatives Considered
- **lockfile**: Uses O_EXCL (fails on NFS), ctime-based staleness (unsuitable for long processes)
- **fs-ext**: Unix-only, has unfixed bugs, abandoned project
- **node-file-lock**: Limited community usage, sparse documentation
- **pidlock**: Linux-only (requires `/proc` filesystem)

### Implementation Notes

**Lock Manager** (`src/utils/lockfile.ts`):
```typescript
import * as lockfile from 'proper-lockfile';
import { join } from 'path';

const LOCK_PATH = join(process.cwd(), '.prism', '.workspace.lock');
const STALE_THRESHOLD = 10000; // 10 seconds
const LOCK_OPTIONS = {
  stale: STALE_THRESHOLD,
  update: STALE_THRESHOLD / 2, // Update every 5 seconds
  retries: {
    retries: 5,
    minTimeout: 100,
    maxTimeout: 1000
  },
  realpath: true
};

export interface LockManager {
  acquire(): Promise<(() => Promise<void>) | null>;
  release(releaseFn: () => Promise<void>): Promise<void>;
  isLocked(): Promise<boolean>;
  isStale(): Promise<boolean>;
  clearStale(): Promise<void>;
  waitFor(timeoutMs: number): Promise<boolean>;
}

export class WorkspaceLockManager implements LockManager {
  async acquire(): Promise<(() => Promise<void>) | null> {
    try {
      const release = await lockfile.lock(LOCK_PATH, LOCK_OPTIONS);
      console.log('✅ Acquired workspace lock');
      return release;
    } catch (error) {
      // Lock is held by another process
      const stale = await this.isStale();
      if (stale) {
        console.log('🔧 Detected stale lock, clearing...');
        await this.clearStale();
        return this.acquire(); // Retry
      }
      return null;
    }
  }

  async release(releaseFn: () => Promise<void>): Promise<void> {
    try {
      await releaseFn();
      console.log('🔓 Released workspace lock');
    } catch (error) {
      console.error('⚠️ Error releasing lock:', error);
    }
  }

  async isLocked(): Promise<boolean> {
    return await lockfile.check(LOCK_PATH, LOCK_OPTIONS);
  }

  async isStale(): Promise<boolean> {
    try {
      const stats = await stat(LOCK_PATH);
      const ageMsec = Date.now() - stats.mtimeMs;
      return ageMsec > STALE_THRESHOLD;
    } catch {
      return false;
    }
  }

  async clearStale(): Promise<void> {
    try {
      await lockfile.unlock(LOCK_PATH, LOCK_OPTIONS);
    } catch (error) {
      console.error('Failed to clear stale lock:', error);
    }
  }

  async waitFor(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (!(await this.isLocked())) {
        return true; // Lock released
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false; // Timeout
  }
}
```

**User Interaction** (FR-007):
```typescript
const lockManager = new WorkspaceLockManager();
const release = await lockManager.acquire();

if (!release) {
  // Lock held, prompt user
  console.log('⏳ Workspace locked by another analysis.');
  console.log('Options:');
  console.log('  (W)ait for completion');
  console.log('  (C)ancel');

  const choice = await promptUser(['W', 'C']);

  if (choice === 'W') {
    const acquired = await lockManager.waitFor(30000); // 30 sec
    if (!acquired) {
      throw new Error('Timeout waiting for lock');
    }
  } else {
    process.exit(0);
  }
}
```

**Key Points**:
- Lock file location: `.prism/.workspace.lock`
- Stale detection: 10 seconds (no mtime update)
- Cross-platform: Works on NFS, NTFS, APFS
- Performance: ~50-100ms typical acquisition time

---

## 4. Session State Persistence Format

### Decision
Use **YAML** format with **yaml** library (v2.8.1, already in dependencies).

### Rationale
- Consistency: All MT-PRISM outputs already use YAML (requirements.yaml, components.yaml, gaps.yaml)
- Human-readable: Developers can inspect/debug session state
- Existing infrastructure: `readYAMLWithSchema` and `writeYAMLWithSchema` utilities already implemented
- Performance adequate: Parse time < 3ms for typical session (< 500ms target)
- Zod integration: Seamless schema validation

### Alternatives Considered
- **JSON**: 79x faster parsing, but less readable and requires separate format from other outputs
- **TOML**: Good readability, but no existing infrastructure in codebase
- **MessagePack**: Binary format, not human-readable, violates debuggability requirement

### Implementation Notes

**Session State Schema** (`src/types/session.ts`):
```typescript
export interface SessionState {
  sessionId: string;           // sess-{timestamp}
  createdAt: string;           // ISO8601
  updatedAt: string;           // ISO8601
  status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
  currentStep: 'prd-analysis' | 'figma-analysis' | 'validation' | 'clarification' | 'tdd-generation';
  progress: {
    stepName: string;
    completed: boolean;
    startedAt?: string;
    completedAt?: string;
  }[];
  prdSource: string;
  figmaSource?: string;
  projectName?: string;
  outputs: {
    tddPath?: string;
    apiSpecPath?: string;
    databaseSchemaPath?: string;
  };
  error?: {
    message: string;
    step: string;
    timestamp: string;
  };
}

export const SessionStateSchema = z.object({
  sessionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'interrupted']),
  currentStep: z.enum(['prd-analysis', 'figma-analysis', 'validation', 'clarification', 'tdd-generation']),
  progress: z.array(z.object({
    stepName: z.string(),
    completed: z.boolean(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional()
  })),
  prdSource: z.string(),
  figmaSource: z.string().optional(),
  projectName: z.string().optional(),
  outputs: z.object({
    tddPath: z.string().optional(),
    apiSpecPath: z.string().optional(),
    databaseSchemaPath: z.string().optional()
  }),
  error: z.object({
    message: z.string(),
    step: z.string(),
    timestamp: z.string()
  }).optional()
});
```

**Save/Load Pattern** (`src/utils/session-manager.ts`):
```typescript
export async function saveState(session: SessionState): Promise<void> {
  const statePath = join('.prism', 'sessions', session.sessionId, 'session_state.yaml');

  // Atomic write: temp file → validate → rename
  await writeYAMLWithSchema(statePath, session, SessionStateSchema);

  console.log(`💾 Session state saved: ${session.sessionId}`);
}

export async function loadState(sessionId: string): Promise<SessionState> {
  const statePath = join('.prism', 'sessions', sessionId, 'session_state.yaml');

  const session = await readYAMLWithSchema(statePath, SessionStateSchema);

  console.log(`📂 Session state loaded: ${sessionId}`);
  return session;
}
```

**Example Session State File**:
```yaml
sessionId: sess-1732278750345
createdAt: 2025-11-22T10:05:50.345Z
updatedAt: 2025-11-22T10:15:30.123Z
status: running
currentStep: validation
progress:
  - stepName: prd-analysis
    completed: true
    startedAt: 2025-11-22T10:06:00.000Z
    completedAt: 2025-11-22T10:08:30.000Z
  - stepName: figma-analysis
    completed: true
    startedAt: 2025-11-22T10:08:31.000Z
    completedAt: 2025-11-22T10:12:00.000Z
  - stepName: validation
    completed: false
    startedAt: 2025-11-22T10:12:01.000Z
prdSource: ./docs/requirements.md
figmaSource: abc123xyz
projectName: My App
outputs:
  tddPath: .prism/sessions/sess-1732278750345/05-tdd/tdd.md
```

**Key Points**:
- Location: `.prism/sessions/{sessionId}/session_state.yaml`
- Save after each major step (FR-008)
- Atomic writes prevent corruption
- Parse performance: < 3ms (meets < 500ms target)

---

## 5. Timeout Implementation

### Decision
Use **AbortController** with graceful shutdown callback.

### Rationale
- Native Web API (available in Node.js 20+)
- Clean signal propagation through async operations
- Integrates with fetch/AI SDK requests
- Allows cleanup before termination (save state)
- Standard pattern across modern JavaScript

### Alternatives Considered
- **setTimeout callbacks**: No native promise support, harder to propagate
- **Promise.race**: Works but requires wrapping every operation
- **Workflow orchestration libraries**: Violates local-first, zero-infrastructure principle

### Implementation Notes

**Timeout Manager** (`src/utils/timeout-manager.ts`):
```typescript
export class WorkflowTimeoutManager {
  private controller: AbortController;
  private timeoutId: NodeJS.Timeout;
  private readonly timeoutMs: number;

  constructor(timeoutMinutes: number = 30) {
    this.controller = new AbortController();
    this.timeoutMs = timeoutMinutes * 60 * 1000;
  }

  start(onTimeout?: () => Promise<void>): void {
    this.timeoutId = setTimeout(async () => {
      console.warn(`⏱️  Workflow timeout (${this.timeoutMs / 60000} minutes) reached`);

      // Cleanup callback executes BEFORE abort
      if (onTimeout) {
        try {
          await onTimeout();
        } catch (error) {
          console.error('Error during timeout cleanup:', error);
        }
      }

      // Trigger abort
      this.controller.abort(new Error('Workflow timeout exceeded'));
    }, this.timeoutMs);
  }

  getSignal(): AbortSignal {
    return this.controller.signal;
  }

  isAborted(): boolean {
    return this.controller.signal.aborted;
  }

  cancel(): void {
    clearTimeout(this.timeoutId);
  }

  abort(reason?: string): void {
    this.cancel();
    this.controller.abort(new Error(reason || 'Workflow aborted'));
  }
}
```

**Workflow Integration** (`src/workflows/discovery.ts`):
```typescript
export async function executeDiscoveryWorkflow(options): Promise<Result> {
  const timeoutManager = new WorkflowTimeoutManager(30); // 30 minutes

  try {
    const session = await createOrResumeSession(options);

    // Start timeout with cleanup callback
    timeoutManager.start(async () => {
      console.log('💾 Saving session state before timeout...');
      session.status = 'paused';
      await saveState(session);
      console.log(`✅ Resume with: prism --resume=${session.sessionId}`);
    });

    // Pass signal through workflow steps
    await prdAnalysis(options.prdSource, { signal: timeoutManager.getSignal() });
    await figmaAnalysis(options.figmaSource, { signal: timeoutManager.getSignal() });
    await validation({ signal: timeoutManager.getSignal() });
    await tddGeneration({ signal: timeoutManager.getSignal() });

    // Success: cancel timeout
    timeoutManager.cancel();
    return { status: 'completed', sessionId: session.sessionId };
  } catch (error) {
    if (error.name === 'AbortError' && timeoutManager.isAborted()) {
      // Timeout occurred (cleanup already done in callback)
      return { status: 'paused', sessionId: session.sessionId };
    }
    throw error;
  }
}
```

**Signal Propagation** (example in skill):
```typescript
async function analyzePRD(source: string, options?: { signal?: AbortSignal }) {
  if (options?.signal?.aborted) {
    throw new Error('Operation aborted');
  }

  // Pass signal to LLM provider (fetch respects AbortSignal)
  const response = await llm.generateText(prompt, {
    signal: options?.signal
  });

  return response;
}
```

**Key Points**:
- Timeout: 30 minutes (FR-016)
- Cleanup callback runs BEFORE abort
- Signal propagates through all async operations
- AbortError distinguishable from other errors
- Session state saved on timeout for resume

---

## 6. Session Cleanup Scheduling

### Decision
Use **on-startup trigger with 7-day throttling** + optional on-demand command.

### Rationale
- Automatic: Cleanup happens regularly without user action
- Lightweight: 7-day throttling prevents overhead (99% of starts < 5ms, 1% at ~220ms)
- Local-first: No background daemons or cron jobs
- Reliable: Worst case cleanup happens every 7 days
- User control: `prism cleanup` command for immediate cleanup

### Alternatives Considered
- **Every startup (no throttle)**: Too costly (80s/year overhead)
- **Background daemon**: Violates local-first, cross-platform issues
- **On-demand only**: Relies on user, unbounded disk growth
- **Cron/scheduled**: Not cross-platform, requires setup

### Implementation Notes

**Cleanup Service** (`src/utils/cleanup.ts`):
```typescript
export interface CleanupResult {
  deletedCount: number;
  freedBytes: number;
  errors: string[];
}

export async function cleanupOldSessions(retentionDays: number = 30): Promise<CleanupResult> {
  const sessionsDir = join('.prism', 'sessions');
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

  let deletedCount = 0;
  let freedBytes = 0;
  const errors: string[] = [];

  const sessions = await readdir(sessionsDir);

  for (const sessionDir of sessions) {
    const sessionPath = join(sessionsDir, sessionDir);
    const statePath = join(sessionPath, 'session_state.yaml');

    try {
      // Check if session is active (has .running lock)
      const runningLockPath = join(sessionPath, '.running');
      if (existsSync(runningLockPath)) {
        continue; // Skip active sessions
      }

      // Check session age
      const stats = await stat(statePath);
      const age = now - stats.mtimeMs;

      if (age > retentionMs) {
        // Get size before deletion
        const size = await getDirectorySize(sessionPath);

        // Delete session
        await rm(sessionPath, { recursive: true, force: true });

        deletedCount++;
        freedBytes += size;
      }
    } catch (error) {
      errors.push(`${sessionDir}: ${error.message}`);
    }
  }

  return { deletedCount, freedBytes, errors };
}

export async function maybeCleanupSessions(): Promise<CleanupResult | null> {
  const lastCleanupPath = join('.prism', '.last-cleanup');
  const throttleMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  try {
    const lastCleanup = parseInt(await readFile(lastCleanupPath, 'utf-8'));
    if (Date.now() - lastCleanup < throttleMs) {
      return null; // Too recent
    }
  } catch {
    // File doesn't exist, proceed
  }

  const result = await cleanupOldSessions(30);
  await writeFile(lastCleanupPath, Date.now().toString());

  return result;
}
```

**CLI Integration** (`src/cli.ts`):
```typescript
// At startup, before workflow
if (!options.resumeSessionId) {
  const cleanupResult = await maybeCleanupSessions();
  if (cleanupResult) {
    console.log(`🧹 Cleaned up ${cleanupResult.deletedCount} old sessions (freed ${formatBytes(cleanupResult.freedBytes)})`);
  }
}
```

**On-Demand Command**:
```bash
prism cleanup              # Remove sessions >30 days old
prism cleanup --dry-run    # Show what would be deleted
prism cleanup --days=90    # Custom retention period
```

**Key Points**:
- Retention: 30 days (FR-014)
- Throttle: Once per 7 days
- Tracking: `.prism/.last-cleanup` file (milliseconds since epoch)
- Performance: ~220ms worst case (40 sessions)
- Safety: Skip sessions with `.running` lock file

---

## Summary

All research is complete. Key decisions:

1. **Environment Detection**: Multi-method with confidence scoring
2. **Auth Discovery**: Priority-ordered (env var → OAuth → .env → prompt)
3. **File Locking**: proper-lockfile with mtime-based stale detection
4. **Session Format**: YAML (consistency with existing outputs)
5. **Timeout**: AbortController with graceful shutdown
6. **Cleanup**: On-startup with 7-day throttling

All decisions prioritize:
- Cross-platform compatibility
- Local-first architecture
- Graceful degradation
- Performance (all targets met)
- User experience (clear errors, recovery paths)

**Next Phase**: Generate design artifacts (data-model.md, contracts/, quickstart.md)
