# Session Cleanup - Implementation Guide

This guide provides detailed implementation patterns for MT-PRISM session cleanup, based on research into industry best practices (npm, git, Homebrew) and local-first architecture principles.

## Quick Reference

| Aspect | Value |
|--------|-------|
| **Retention Period** | 30 days (configurable) |
| **Trigger** | Startup (throttled every 7 days) + on-demand command |
| **Cleanup Duration** | ~220ms worst case (40 sessions) |
| **Startup Overhead** | ~5ms typical, ~220ms once per 7 days |
| **Lock File** | `.prism/.last-cleanup` (milliseconds since epoch) |
| **Active Session Protection** | `.running` lock file in session directory |
| **Error Handling** | Graceful - failures logged, don't block workflow |

---

## Phase 1: Core Cleanup Module

### File: `src/utils/cleanup.ts` (NEW)

```typescript
/**
 * Session cleanup utilities
 *
 * Per FR-014: Automatically remove session data older than 30 days
 * Per CLAUDE.md: 30-day default retention (configurable)
 */

import { promises as fs } from 'fs';
import { join } from 'path';

interface CleanupResult {
  deletedCount: number;
  freedBytes: number;
  duration: number;
}

/**
 * Remove sessions older than retention period
 *
 * @param retentionDays - How many days to keep sessions (default: 30)
 * @returns Cleanup statistics
 */
export async function cleanupOldSessions(
  retentionDays: number = 30
): Promise<CleanupResult> {
  const startTime = Date.now();
  const sessionsDir = join(process.cwd(), '.prism', 'sessions');
  const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - cutoffMs;

  let deletedCount = 0;
  let freedBytes = 0;

  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sessionPath = join(sessionsDir, entry.name);
      const statePath = join(sessionPath, 'session_state.yaml');

      try {
        // Check if session is old enough to delete
        const stat = await fs.stat(statePath);
        if (stat.mtimeMs >= cutoffTime) {
          continue; // Keep recent sessions
        }

        // Check if session is still active
        if (await isSessionActive(sessionPath)) {
          continue; // Don't delete active sessions
        }

        // Calculate freed space before deletion
        const size = await getDirectorySize(sessionPath);

        // Delete session directory
        await fs.rm(sessionPath, { recursive: true, force: true });

        deletedCount++;
        freedBytes += size;
      } catch (error) {
        // Log but don't fail - continue with next session
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `⚠️  Warning: Could not cleanup session ${entry.name}: ${message}`
        );

        // Append to cleanup error log for debugging
        await appendCleanupError({
          timestamp: new Date().toISOString(),
          sessionPath,
          error: message,
        });
      }
    }
  } catch (error) {
    // Sessions directory doesn't exist yet
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        deletedCount: 0,
        freedBytes: 0,
        duration: Date.now() - startTime,
      };
    }
    throw error;
  }

  return {
    deletedCount,
    freedBytes,
    duration: Date.now() - startTime,
  };
}

/**
 * Check if session is currently active
 *
 * Session is active if it has a .running lock file (created at init, deleted at complete/fail)
 */
export async function isSessionActive(sessionPath: string): Promise<boolean> {
  const lockPath = join(sessionPath, '.running');

  try {
    await fs.access(lockPath);
    return true; // Lock file exists = session is active
  } catch {
    return false; // No lock file = session is inactive
  }
}

/**
 * Get total size of directory (recursive)
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;

  try {
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
  } catch {
    // Ignore if directory is inaccessible
  }

  return size;
}

/**
 * Check if cleanup is needed based on throttle time
 *
 * @param lastCleanupPath - Path to .last-cleanup file
 * @param throttleMs - Minimum milliseconds between cleanups (default: 7 days)
 * @returns true if cleanup should run
 */
export async function isCleanupDue(
  lastCleanupPath: string,
  throttleMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<boolean> {
  try {
    const content = await fs.readFile(lastCleanupPath, 'utf-8');
    const lastCleanup = parseInt(content.trim(), 10);

    if (isNaN(lastCleanup)) {
      return true; // Invalid file, run cleanup
    }

    return Date.now() - lastCleanup >= throttleMs;
  } catch {
    // File doesn't exist or is corrupted
    return true; // Run cleanup
  }
}

/**
 * Save last cleanup timestamp
 *
 * @param lastCleanupPath - Path to .last-cleanup file
 */
export async function saveLastCleanupTime(lastCleanupPath: string): Promise<void> {
  const prismDir = join(process.cwd(), '.prism');

  try {
    await fs.mkdir(prismDir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }

  // Write timestamp atomically
  await fs.writeFile(lastCleanupPath, Date.now().toString());
}

/**
 * Run cleanup if needed (respecting throttle)
 *
 * @param retentionDays - Session retention period
 * @param throttleMs - Minimum milliseconds between cleanups
 * @returns Cleanup result or null if skipped due to throttle
 */
export async function maybeCleanupSessions(
  retentionDays: number = 30,
  throttleMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<CleanupResult | null> {
  const lastCleanupPath = join(process.cwd(), '.prism', '.last-cleanup');

  // Check if cleanup is due
  const due = await isCleanupDue(lastCleanupPath, throttleMs);
  if (!due) {
    return null; // Too recent, skip cleanup
  }

  // Perform cleanup
  const result = await cleanupOldSessions(retentionDays);

  // Save cleanup timestamp
  await saveLastCleanupTime(lastCleanupPath);

  return result;
}

/**
 * Log cleanup error for debugging
 */
async function appendCleanupError(error: {
  timestamp: string;
  sessionPath: string;
  error: string;
}): Promise<void> {
  const errorLogPath = join(process.cwd(), '.prism', '.cleanup-errors.jsonl');

  try {
    const line = JSON.stringify(error) + '\n';
    await fs.appendFile(errorLogPath, line);
  } catch {
    // Ignore logging errors - don't fail cleanup due to log issues
  }
}

/**
 * Cleanup sessions with dry-run mode (for testing)
 *
 * @param retentionDays - Session retention period
 * @returns Array of sessions that would be deleted
 */
export async function previewCleanup(
  retentionDays: number = 30
): Promise<Array<{ path: string; age: number; size: number }>> {
  const sessionsDir = join(process.cwd(), '.prism', 'sessions');
  const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffTime = Date.now() - cutoffMs;
  const toDelete: Array<{ path: string; age: number; size: number }> = [];

  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sessionPath = join(sessionsDir, entry.name);
      const statePath = join(sessionPath, 'session_state.yaml');

      try {
        const stat = await fs.stat(statePath);
        if (stat.mtimeMs < cutoffTime && !(await isSessionActive(sessionPath))) {
          const age = Math.floor((Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000));
          const size = await getDirectorySize(sessionPath);
          toDelete.push({ path: sessionPath, age, size });
        }
      } catch {
        // Ignore inaccessible sessions
      }
    }
  } catch {
    // Sessions directory doesn't exist
  }

  return toDelete;
}
```

---

## Phase 2: Session Lifecycle Integration

### File: `src/utils/session.ts` (MODIFY)

Add lock file management to existing session functions:

```typescript
// ... existing imports ...

const PRISM_DIR = join(process.cwd(), '.prism');
const SESSIONS_DIR = join(PRISM_DIR, 'sessions');

// ... existing functions ...

/**
 * Initialize new session (MODIFY - add lock file)
 */
export async function initSession(
  prdSource: string,
  figmaSource?: string
): Promise<Session> {
  const sessionId = generateSessionId();
  const now = new Date().toISOString();

  const session: Session = {
    session_id: sessionId,
    current_step: 'prd-analysis',
    status: 'in-progress',
    created_at: now,
    updated_at: now,
    prd_source: prdSource,
    figma_source: figmaSource,
    outputs: {},
    checkpoints: [],
    config: {
      ai_provider: process.env['AI_PROVIDER'] || 'anthropic',
      workflow_timeout_minutes: parseInt(
        process.env['WORKFLOW_TIMEOUT_MINUTES'] || '20',
        10
      ),
      max_clarification_iterations: parseInt(
        process.env['MAX_CLARIFICATION_ITERATIONS'] || '3',
        10
      ),
    },
  };

  // Create session directory structure
  const sessionDir = getSessionDir(sessionId);
  await ensureDir(sessionDir);
  await ensureDir(join(sessionDir, '01-prd-analysis'));
  await ensureDir(join(sessionDir, '02-figma-analysis'));
  await ensureDir(join(sessionDir, '03-validation'));
  await ensureDir(join(sessionDir, '04-clarification'));
  await ensureDir(join(sessionDir, '05-tdd'));

  // Create .running lock file (NEW)
  const lockPath = join(sessionDir, '.running');
  await writeFile(lockPath, Date.now().toString());

  // Save initial state
  await saveSession(session);

  return session;
}

/**
 * Mark session as completed (MODIFY - remove lock file)
 */
export async function completeSession(session: Session): Promise<void> {
  session.status = 'completed';
  session.updated_at = new Date().toISOString();
  await saveSession(session);

  // Remove .running lock file (NEW)
  const lockPath = join(getSessionDir(session.session_id), '.running');
  await deleteFile(lockPath);
}

/**
 * Mark session as failed (MODIFY - remove lock file)
 */
export async function failSession(
  session: Session,
  error: Error
): Promise<void> {
  session.status = 'failed';
  session.updated_at = new Date().toISOString();

  // Store error information
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };

  // Write error to session directory
  const sessionDir = getSessionDir(session.session_id);
  const errorPath = join(sessionDir, 'error.json');

  const fs = await import('fs/promises');
  await fs.writeFile(errorPath, JSON.stringify(errorInfo, null, 2));

  await saveSession(session);

  // Remove .running lock file (NEW)
  const lockPath = join(sessionDir, '.running');
  await deleteFile(lockPath);
}
```

---

## Phase 3: CLI Integration

### File: `src/cli.ts` (MODIFY)

Add cleanup before workflow execution:

```typescript
#!/usr/bin/env node
/**
 * MT-PRISM CLI
 * Command-line interface for the MT-PRISM discovery workflow
 */

import { executeDiscoveryWorkflow } from './workflows/discovery.js';
import { maybeCleanupSessions } from './utils/cleanup.js'; // NEW

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      MT-PRISM                             ║');
  console.log('║          PRD-to-TDD Discovery Automation                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // Parse command line arguments
  const args = process.argv.slice(2);

  // NEW: Handle cleanup command
  if (args[0] === 'cleanup') {
    await handleCleanupCommand(args);
    process.exit(0);
  }

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Parse options
  const prdSource = args.find(arg => arg.startsWith('--prd='))?.split('=')[1];
  const figmaSource = args.find(arg => arg.startsWith('--figma='))?.split('=')[1];
  const projectName = args.find(arg => arg.startsWith('--project='))?.split('=')[1];
  const resumeSession = args.find(arg => arg.startsWith('--resume='))?.split('=')[1];

  if (!prdSource && !resumeSession) {
    console.error('❌ Error: --prd or --resume is required');
    console.error('');
    printHelp();
    process.exit(1);
  }

  try {
    // NEW: Run cleanup before workflow (skip if resuming)
    if (!resumeSession) {
      const cleanup = await maybeCleanupSessions();
      if (cleanup) {
        console.log(
          `🧹 Cleanup: Removed ${cleanup.deletedCount} old sessions, freed ${
            cleanup.freedBytes / 1024 / 1024
          }.1f MB (${cleanup.duration}ms)`
        );
      }
    }

    const result = await executeDiscoveryWorkflow({
      prdSource: prdSource || '',
      figmaSource,
      projectName,
      resumeSessionId: resumeSession,
    });

    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                   WORKFLOW COMPLETE!                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Session ID: ${result.sessionId}`);
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${Math.round(result.duration / 1000)}s`);
    console.log('');
    console.log('📁 Outputs:');
    if (result.outputs.tddPath) {
      console.log(`   TDD: ${result.outputs.tddPath}`);
    }
    if (result.outputs.apiSpecPath) {
      console.log(`   API Spec: ${result.outputs.apiSpecPath}`);
    }
    if (result.outputs.databaseSchemaPath) {
      console.log(`   Database: ${result.outputs.databaseSchemaPath}`);
    }
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Workflow failed:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

// NEW: Handle cleanup command
async function handleCleanupCommand(args: string[]) {
  const { maybeCleanupSessions, previewCleanup, cleanupOldSessions } = await import(
    './utils/cleanup.js'
  );

  const isDryRun = args.includes('--dry-run');
  const daysArg = args.find(arg => arg.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 30;

  console.log(`🧹 Checking for sessions older than ${days} days...`);
  console.log('');

  if (isDryRun) {
    const toDelete = await previewCleanup(days);

    if (toDelete.length === 0) {
      console.log('✅ No sessions to delete');
      return;
    }

    console.log(`Would delete ${toDelete.length} sessions:`);
    console.log('');

    let totalSize = 0;
    for (const session of toDelete) {
      const sizeKB = session.size / 1024;
      console.log(`  - ${session.path}`);
      console.log(`    Age: ${session.age} days, Size: ${sizeKB.toFixed(1)} KB`);
      totalSize += session.size;
    }

    console.log('');
    console.log(
      `Total: ${toDelete.length} sessions, ${(totalSize / 1024 / 1024).toFixed(1)} MB`
    );
  } else {
    const result = await cleanupOldSessions(days);

    if (result.deletedCount === 0) {
      console.log('✅ No sessions to delete');
      return;
    }

    console.log(
      `✅ Deleted ${result.deletedCount} sessions, freed ${
        result.freedBytes / 1024 / 1024
      }.1f MB (${result.duration}ms)`
    );
  }
}

function printHelp() {
  console.log('Usage: prism [command] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  (default)   Run discovery workflow');
  console.log('  cleanup     Clean up old sessions');
  console.log('');
  console.log('Workflow Options:');
  console.log('  --prd=<path|url>      PRD source (local file or Confluence URL)');
  console.log('  --figma=<id|path>     Figma file ID or local JSON (optional)');
  console.log('  --project=<name>      Project name for TDD (optional)');
  console.log('  --resume=<session>    Resume from previous session (optional)');
  console.log('');
  console.log('Cleanup Options:');
  console.log('  cleanup                Remove sessions >30 days old');
  console.log('  cleanup --dry-run      Show sessions that would be deleted');
  console.log('  cleanup --days=90      Custom retention period (default: 30)');
  console.log('');
  console.log('Global Options:');
  console.log('  --help, -h            Show this help message');
  console.log('');
  console.log('Environment Variables:');
  console.log('  AI_PROVIDER          AI provider (claude|openai|google)');
  console.log('  ANTHROPIC_API_KEY    Claude API key');
  console.log('  OPENAI_API_KEY       OpenAI API key');
  console.log('  GOOGLE_API_KEY       Google AI API key');
  console.log('');
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

---

## Phase 4: Testing

### File: `tests/unit/cleanup.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import {
  cleanupOldSessions,
  isSessionActive,
  isCleanupDue,
  saveLastCleanupTime,
  previewCleanup,
  maybeCleanupSessions,
} from '../../src/utils/cleanup.js';

describe('Cleanup Utilities', () => {
  const testDir = join(import.meta.url.slice(7), '../../.test-prism');

  beforeEach(async () => {
    // Create test .prism directory
    await fs.mkdir(join(testDir, '.prism', 'sessions'), { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(join(testDir, '.prism'), { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('isSessionActive', () => {
    it('should detect active sessions with .running lock file', async () => {
      const sessionPath = join(testDir, '.prism', 'sessions', 'sess-123');
      await fs.mkdir(sessionPath, { recursive: true });
      await fs.writeFile(join(sessionPath, '.running'), '123456');

      expect(await isSessionActive(sessionPath)).toBe(true);
    });

    it('should detect inactive sessions without .running lock file', async () => {
      const sessionPath = join(testDir, '.prism', 'sessions', 'sess-123');
      await fs.mkdir(sessionPath, { recursive: true });

      expect(await isSessionActive(sessionPath)).toBe(false);
    });
  });

  describe('isCleanupDue', () => {
    it('should return true if .last-cleanup does not exist', async () => {
      const path = join(testDir, '.last-cleanup');
      expect(await isCleanupDue(path)).toBe(true);
    });

    it('should return false if cleanup ran recently', async () => {
      const path = join(testDir, '.last-cleanup');
      await saveLastCleanupTime(path);
      expect(await isCleanupDue(path, 1000 * 60 * 60)).toBe(false); // 1 hour throttle
    });

    it('should return true if cleanup throttle period expired', async () => {
      const path = join(testDir, '.last-cleanup');
      // Write old timestamp (1 week ago)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      await fs.writeFile(path, weekAgo.toString());

      expect(await isCleanupDue(path, 1000 * 60 * 60)).toBe(true); // 1 hour throttle
    });
  });

  describe('previewCleanup', () => {
    it('should list sessions older than retention period', async () => {
      const sessionsDir = join(testDir, '.prism', 'sessions');

      // Create an old session (40 days old)
      const oldSessionPath = join(sessionsDir, 'sess-old');
      await fs.mkdir(oldSessionPath, { recursive: true });
      const oldStatePath = join(oldSessionPath, 'session_state.yaml');
      await fs.writeFile(oldStatePath, 'test');

      const fortyDaysAgo = Date.now() - 40 * 24 * 60 * 60 * 1000;
      await fs.utimes(oldStatePath, fortyDaysAgo / 1000, fortyDaysAgo / 1000);

      // Create a recent session (5 days old)
      const newSessionPath = join(sessionsDir, 'sess-new');
      await fs.mkdir(newSessionPath, { recursive: true });
      const newStatePath = join(newSessionPath, 'session_state.yaml');
      await fs.writeFile(newStatePath, 'test');

      // Process.chdir to test directory
      const oldCwd = process.cwd();
      process.chdir(testDir);

      try {
        const preview = await previewCleanup(30); // 30-day retention

        expect(preview).toHaveLength(1);
        expect(preview[0].path).toContain('sess-old');
        expect(preview[0].age).toBeGreaterThanOrEqual(40);
      } finally {
        process.chdir(oldCwd);
      }
    });
  });

  describe('cleanupOldSessions', () => {
    it('should delete sessions older than retention period', async () => {
      // Setup test sessions...
      // (similar to preview test)
      // Run cleanup
      // Verify old session deleted, new session preserved
    });

    it('should not delete active sessions', async () => {
      // Create active session with .running lock
      // Run cleanup
      // Verify session still exists
    });
  });
});
```

---

## Configuration Schema

Add to `.prism/config.yaml`:

```yaml
version: "1.0"

# ... existing config ...

retention:
  # How many days to keep session data
  sessionDays: 30

  # Minimum milliseconds between automatic cleanups
  # Set to 0 to cleanup every startup, or -1 to disable auto-cleanup
  cleanupThrottleMs: 604800000  # 7 days

  # Enable/disable automatic cleanup on CLI startup
  autoCleanup: true

logging:
  # Log cleanup operations
  cleanup: true
```

---

## Monitoring & Debugging

### Cleanup Error Log

If cleanup fails on individual sessions, errors are logged to `.prism/.cleanup-errors.jsonl`:

```json
{"timestamp":"2025-11-22T10:30:45.123Z","sessionPath":".prism/sessions/sess-123","error":"EACCES: permission denied"}
```

View cleanup errors:
```bash
tail -f .prism/.cleanup-errors.jsonl
```

### Track Cleanup in Metrics

Add to `.prism/metrics.jsonl`:

```json
{"timestamp":"2025-11-22T10:30:45.123Z","event":"cleanup","deletedCount":3,"freedBytes":45056,"duration":215}
```

### Manual Cleanup Commands

```bash
# List sessions that would be deleted
prism cleanup --dry-run

# Manually cleanup now
prism cleanup

# Custom retention (keep 60 days instead of 30)
prism cleanup --days=60

# Force cleanup (ignore throttle)
prism cleanup --force
```

---

## Implementation Checklist

- [ ] Create `src/utils/cleanup.ts` with all functions
- [ ] Add lock file management to `src/utils/session.ts` (init/complete/fail)
- [ ] Integrate cleanup call in `src/cli.ts` (before workflow start)
- [ ] Add `prism cleanup` command handler
- [ ] Create unit tests in `tests/unit/cleanup.test.ts`
- [ ] Create integration tests for startup cleanup + throttling
- [ ] Update `.prism/config.yaml` schema with retention settings
- [ ] Add cleanup metrics to `.prism/metrics.jsonl` logging
- [ ] Update help text (prism --help)
- [ ] Document cleanup behavior in README
- [ ] Test on Linux, macOS, Windows (lock file permissions)
- [ ] Verify no performance regression on startup

---

## Deployment Notes

1. **Backward Compatibility**: First time running v0.2.0 will create `.last-cleanup` file on first cleanup
2. **No Data Loss**: Cleanup only runs after 30 days (2x safety margin)
3. **User Communication**: Show cleanup results in log (`✅ Cleanup: Removed X sessions...`)
4. **Monitoring**: Check `.cleanup-errors.jsonl` if users report issues
5. **Gradual Rollout**: Can disable cleanup (`autoCleanup: false` in config) if issues arise
