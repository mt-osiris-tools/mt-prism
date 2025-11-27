# Session Cleanup Scheduling Research

## Executive Summary

MT-PRISM requires automatic cleanup of session data older than 30 days (per FR-014 in spec.md). This research evaluates when and how to trigger cleanup to balance resource usage, reliability, and simplicity within the local-first, no-daemon architecture.

**Recommendation**: Hybrid trigger strategy - cleanup on startup (throttled to max once per 7 days) with optional on-demand command.

---

## Recommended Strategy

### Primary Trigger: On Startup (with Throttling)

**Trigger Point**: When CLI starts execution (in `cli.ts` before workflow begins)

**Throttling Mechanism**: Track last cleanup time in `.prism/.last-cleanup` file

```
Max once per 7 days (configurable via .prism/config.yaml)
Default: 604,800,000 ms (7 days)
Rationale: Balance cost (disk I/O) with timeliness (max 7 days old)
```

**Benefits**:
- ✅ Guaranteed cleanup occurrence (runs with every CLI invocation)
- ✅ No background processes or cron jobs needed (local-first principle)
- ✅ Minimal performance impact with 7-day throttling
- ✅ Cleanup happens when system is already active
- ✅ Works offline and across all platforms (Windows/Mac/Linux)

**Drawbacks**:
- ~10-50ms delay on startup (first time per 7 days)
- Cleanup may be skipped if CLI never runs in a week

### Secondary Trigger: On-Demand Command

**Command**: `prism cleanup [--dry-run] [--days=30]`

**Rationale**: Allows users to manually clean sessions immediately or with custom retention

```bash
prism cleanup              # Remove sessions >30 days old
prism cleanup --dry-run    # Show what would be deleted (no action)
prism cleanup --days=90    # Custom retention: keep 90 days
```

---

## Implementation Pattern

### A. Check if Cleanup Needed (on startup)

```typescript
// In src/cli.ts, after environment detection
async function maybeCleanupSessions() {
  const lastCleanupPath = join(prismDir, '.last-cleanup');
  const retentionDays = config.retention?.sessionDays ?? 30;
  const throttleMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Check if cleanup is due
  try {
    const lastCleanup = await readLastCleanupTime(lastCleanupPath);
    if (Date.now() - lastCleanup < throttleMs) {
      return; // Too recent, skip cleanup
    }
  } catch {
    // File doesn't exist or corrupted, proceed with cleanup
  }

  // Perform cleanup
  await cleanupOldSessions(retentionDays);
  await saveLastCleanupTime(lastCleanupPath);
}

// Call before starting workflow
await maybeCleanupSessions();
```

### B. Cleanup Implementation

```typescript
// In src/utils/cleanup.ts (NEW FILE)

export async function cleanupOldSessions(
  retentionDays: number = 30
): Promise<{ deletedCount: number; freedBytes: number }> {
  const sessionsDir = join(process.cwd(), '.prism', 'sessions');
  const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - cutoffMs;

  const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
  let deletedCount = 0;
  let freedBytes = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sessionPath = join(sessionsDir, entry.name);
    const statePath = join(sessionPath, 'session_state.yaml');

    try {
      // Get modification time of session state file
      const stat = await fs.stat(statePath);
      if (stat.mtimeMs < cutoffTime) {
        // Session is old enough to delete
        const size = await getDirectorySize(sessionPath);
        await fs.rm(sessionPath, { recursive: true, force: true });
        deletedCount++;
        freedBytes += size;
      }
    } catch (error) {
      // Log but don't fail - skip corrupted sessions
      console.warn(`Warning: Could not cleanup session ${entry.name}`);
    }
  }

  return { deletedCount, freedBytes };
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      size += await getDirectorySize(fullPath);
    } else {
      const stat = await fs.stat(fullPath);
      size += stat.size;
    }
  }

  return size;
}

// Helper: Read last cleanup timestamp
async function readLastCleanupTime(path: string): Promise<number> {
  const content = await fs.readFile(path, 'utf-8');
  return parseInt(content, 10);
}

// Helper: Save last cleanup timestamp
async function saveLastCleanupTime(path: string): Promise<void> {
  await fs.writeFile(path, Date.now().toString());
}
```

### C. Safety Mechanisms

#### 1. Avoid Deleting Active Sessions

**Problem**: Don't delete a session while it's actively running

**Solution**: Check lock file presence

```typescript
export async function isSessionActive(sessionPath: string): Promise<boolean> {
  const lockPath = join(sessionPath, '.running');

  // Check if lock file exists (created when session starts)
  try {
    await fs.access(lockPath);
    return true;
  } catch {
    return false;
  }
}

// Modified cleanup logic
if (await isSessionActive(sessionPath)) {
  continue; // Skip active sessions
}
```

**Implementation**: In `src/utils/session.ts`, add lock file creation/deletion:

```typescript
export async function initSession(...): Promise<Session> {
  // ... existing code ...

  // Create .running lock file
  const lockPath = join(sessionDir, '.running');
  await writeFile(lockPath, Date.now().toString());
}

export async function completeSession(session: Session): Promise<void> {
  // ... existing code ...

  // Remove .running lock file
  const lockPath = join(getSessionDir(session.session_id), '.running');
  await deleteFile(lockPath);
}

export async function failSession(session: Session, error: Error): Promise<void> {
  // ... existing code ...

  // Remove .running lock file
  const lockPath = join(getSessionDir(session.session_id), '.running');
  await deleteFile(lockPath);
}
```

#### 2. Handle Cleanup Failures Gracefully

```typescript
export async function cleanupOldSessions(
  retentionDays: number = 30
): Promise<{ deletedCount: number; freedBytes: number }> {
  // ... implementation ...

  // On error, log but don't fail the workflow
  try {
    await fs.rm(sessionPath, { recursive: true, force: true });
  } catch (error) {
    // Log warning but continue cleanup of other sessions
    const warning = {
      timestamp: new Date().toISOString(),
      sessionPath,
      error: error instanceof Error ? error.message : String(error),
    };

    // Append to cleanup error log
    const errorLog = join(prismDir, '.cleanup-errors.jsonl');
    await appendFile(errorLog, JSON.stringify(warning) + '\n');
  }
}
```

#### 3. Prevent Cleanup During Active Workflow

```typescript
// In src/workflows/discovery.ts
export async function executeDiscoveryWorkflow(
  options: DiscoveryWorkflowOptions
): Promise<DiscoveryWorkflowResult> {
  // SKIP cleanup if resuming (don't delay resumed workflows)
  if (!options.resumeSessionId) {
    await maybeCleanupSessions();
  }

  // ... existing workflow code ...
}
```

---

## Tracking Last Cleanup

### `.prism/.last-cleanup` Format

**File Location**: `.prism/.last-cleanup` (sibling to `config.yaml`, `metrics.jsonl`)

**Content**: Single number (milliseconds since epoch)

```
1732278750345
```

**Rationale**:
- Simple, human-readable (can be converted with `new Date(1732278750345)`)
- No YAML/JSON parsing needed (super fast)
- Single line = atomic write safety
- ~13 bytes per file (negligible)

**Alternative Considered**: Store in `config.yaml` metadata
- ❌ Rejected: Adds complexity, requires full config rewrite on each cleanup

---

## Performance Analysis

### Estimated Cleanup Time

**Scenario**: 30 days of history (typical weekly usage)

Assumptions:
- ~40 sessions total (4 per week × 10 weeks)
- ~12 KB per session directory (state file + metadata)
- ~480 KB total for 30 days

**Cleanup Operations**:
1. List sessions directory: ~2ms
2. Stat each session (40 × 2ms): ~80ms
3. Check activity locks (40 × 1ms): ~40ms
4. Delete old sessions (20 × 5ms): ~100ms
5. Update `.last-cleanup`: ~1ms

**Total Cleanup Duration**: ~220ms (worst case)
**Without Throttling**: ~220ms × 52 weeks/year = 11.4 seconds/year cumulative
**With 7-day Throttling**: ~220ms × 7 times/year = 1.5 seconds/year cumulative

### Impact on Startup

**Baseline startup time** (before cleanup): ~50ms (parsing, validation)
**With cleanup (every 7 days)**: +220ms = 270ms total
**With cleanup (typical day)**: +5ms (just check `last-cleanup` time) = 55ms total

**Verdict**: Negligible impact - throttling ensures cleanup runs only 52 times/year average

### Disk Impact

30 days of typical usage:
- ~480 KB session data
- ~15 KB cleanup metadata (`.last-cleanup`, error logs)
- **Total**: ~500 KB (essentially free)

After cleanup: 0 bytes freed (sessions deleted)

---

## Alternatives Considered

### 1. Cleanup Every Startup (No Throttling)

| Aspect | Notes |
|--------|-------|
| **Pros** | - Guaranteed timely cleanup<br>- Simplest implementation<br>- No state file needed |
| **Cons** | - Performance impact on every startup (~220ms)<br>- Unnecessary work on typical days<br>- 220ms × 365 days = 80 seconds/year overhead |
| **Verdict** | ❌ REJECTED - Performance waste not acceptable |

### 2. Background Daemon Process

| Aspect | Notes |
|--------|-------|
| **Pros** | - Runs on fixed schedule (e.g., daily)<br>- No impact on CLI startup |
| **Cons** | ❌ VIOLATES local-first principle (no daemons)<br>❌ Cross-platform complexity (systemd vs. launchd vs. Task Scheduler)<br>❌ Resource consumption (running continuously)<br>❌ Difficult to debug/control |
| **Verdict** | ❌ REJECTED - Violates architecture |

### 3. On-Demand Only (No Automatic Cleanup)

| Aspect | Notes |
|--------|-------|
| **Pros** | - Zero automatic overhead<br>- Users control cleanup timing |
| **Cons** | ❌ Risk of unbounded disk growth<br>❌ Users may forget to run cleanup<br>❌ Doesn't meet FR-014 requirement (automatic removal)<br>- Similar to `yarn cache clean` or `cargo clean` (not ideal) |
| **Verdict** | ⚠️ PARTIAL - Good as secondary, not sufficient alone |

### 4. Cleanup on Schedule (Cron-like)

| Aspect | Notes |
|--------|-------|
| **Pros** | - Predictable timing<br>- Decoupled from CLI startup |
| **Cons** | ❌ Requires background process or cron setup<br>❌ Not cross-platform friendly (no cron on Windows)<br>- Users may not have cron available |
| **Verdict** | ❌ REJECTED - Not feasible in local-first model |

### 5. Cleanup on Session Creation/Completion

| Aspect | Notes |
|--------|-------|
| **Pros** | - Natural trigger point<br>- Happens during active workflow |
| **Cons** | ❌ Cleanup may slow down workflow completion<br>- Users may see performance impact when finishing important work<br>- May not cleanup if user only reads (no new sessions created) |
| **Verdict** | ⚠️ PARTIAL - Could work as backup trigger |

### 6. Cleanup on Idle (OS Integration)

| Aspect | Notes |
|--------|-------|
| **Pros** | - Smart timing (only when system idle) |
| **Cons** | ❌ Complex OS integration needed<br>❌ Not available on all platforms<br>❌ Difficult to test and debug |
| **Verdict** | ❌ REJECTED - Over-engineering for local-first |

---

## Hybrid Strategy Advantages

**Why startup + on-demand is optimal**:

1. **Automatic Coverage** (startup trigger)
   - Cleanup happens naturally ~52 times/year
   - Users don't have to remember
   - Meets FR-014 requirement

2. **User Control** (on-demand command)
   - Power users can force cleanup immediately
   - Useful for testing, debugging, disk space recovery
   - No performance penalty for users who don't care

3. **Performance** (7-day throttling)
   - 99.3% of startups have < 5ms overhead
   - One per week (0.3% of startups) pays 220ms cost
   - Negligible annual cumulative impact

4. **Simplicity** (local-first)
   - No daemons, cron, or external services
   - Single timestamp file for throttling
   - Works offline on all platforms

5. **Reliability** (fail-safe)
   - Startup cleanup ensures sessions eventually delete
   - If cleanup fails, user can run on-demand command
   - No cascading failures

---

## Implementation Checklist

- [ ] Create `src/utils/cleanup.ts` with `cleanupOldSessions()` function
- [ ] Add `.last-cleanup` timestamp tracking
- [ ] Add `.running` lock file to session lifecycle (init/complete/fail)
- [ ] Integrate `maybeCleanupSessions()` into CLI startup (skip if resuming)
- [ ] Add `prism cleanup` command to CLI
- [ ] Test cleanup with 30-40 test sessions
- [ ] Test lock file prevents deletion of active sessions
- [ ] Test throttling (verify cleanup skipped within 7 days)
- [ ] Test on-demand command with `--dry-run` flag
- [ ] Add cleanup metrics to `.prism/metrics.jsonl`
- [ ] Document cleanup behavior in help text

---

## Safety Considerations

### Data Loss Prevention

1. **Only delete sessions > 30 days old** (generous retention)
2. **Skip sessions with `.running` lock file** (active sessions protected)
3. **Fail gracefully on individual session errors** (one bad session doesn't block cleanup)
4. **Log cleanup actions to `.prism/.cleanup-errors.jsonl`** (audit trail)
5. **Dry-run mode** (`--dry-run` flag) shows what would be deleted without action

### User Communication

```typescript
// Log cleanup results to console (quiet mode)
console.log('Cleanup: Removed X old sessions, freed Y MB');

// Show more detail in dry-run
if (dryRun) {
  console.log('Would delete:');
  for (const session of oldSessions) {
    console.log(`  - ${session.id} (${getAge(session)} old)`);
  }
}
```

---

## Configuration

Add to `.prism/config.yaml`:

```yaml
version: "1.0"
retention:
  sessionDays: 30              # How many days to keep sessions
  cleanupThrottleMs: 604800000 # Min time between auto-cleanup (7 days)
  autoCleanup: true            # Enable automatic cleanup on startup
```

---

## Sources & References

### Research Sources
- **npm cleanup**: Stores cache metadata with last cleanup timestamp, uses throttling strategy
- **git gc**: Automatic maintenance with `--auto` flag, detects need based on object count
- **Homebrew**: Weekly cleanup via scheduled tasks, explicit `brew cleanup` command
- **Best Practice**: Hybrid trigger (automatic + on-demand) is industry standard for CLI tools

### MT-PRISM Architecture
- **FR-014** in `specs/001-claude-code-integration/spec.md`: "System MUST automatically remove session data (both completed and incomplete) older than 30 days"
- **Session Format**: `.prism/sessions/{sessionId}/session_state.yaml` with `updated_at` timestamp
- **Local-First Principle**: No background daemons, no external services (per CLAUDE.md)

---

## Next Steps

1. **Implementation**: Develop `src/utils/cleanup.ts` with full test coverage
2. **Integration**: Wire cleanup into CLI startup and add command
3. **Testing**:
   - Unit tests for `cleanupOldSessions()` function
   - Integration tests for startup + throttling
   - Lock file protection tests
4. **Documentation**: Add cleanup section to user guide
5. **Monitoring**: Track cleanup metrics in `.prism/metrics.jsonl`
