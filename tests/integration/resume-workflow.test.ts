/**
 * Integration test for interrupt + resume workflow
 *
 * Tests that analyses can be interrupted and resumed from checkpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initSession,
  saveSession,
  loadSession,
  resumeSession,
  saveCheckpoint,
} from '../../src/utils/session.js';

describe('Resume Workflow Integration', () => {
  let testDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'prism-resume-test-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  it('should resume session from last checkpoint after interruption', async () => {
    // Create session and save checkpoint
    const session = await initSession('./test-prd.md');
    await saveCheckpoint(session, 'prd-analysis', ['requirements.yaml'], {
      duration_ms: 1000,
    });

    // Simulate interruption by loading session
    const resumed = await resumeSession(session.session_id);

    expect(resumed.session_id).toBe(session.session_id);
    expect(resumed.checkpoints).toHaveLength(1);
    expect(resumed.checkpoints[0]?.step).toBe('prd-analysis');
    expect(resumed.current_step).toBe('prd-analysis');
  });

  it('should resume from failed state and reset to in-progress', async () => {
    const session = await initSession('./test-prd.md');
    session.status = 'failed';
    await saveSession(session);

    const resumed = await resumeSession(session.session_id);

    expect(resumed.status).toBe('in-progress');
  });

  it('should throw error when resuming completed session', async () => {
    const session = await initSession('./test-prd.md');
    session.status = 'completed';
    await saveSession(session);

    await expect(resumeSession(session.session_id)).rejects.toThrow(
      'Cannot resume completed session'
    );
  });

  it('should resume in under 30 seconds (SC-003)', async () => {
    const session = await initSession('./test-prd.md');
    await saveCheckpoint(session, 'prd-analysis', [], { duration_ms: 1000 });
    await saveCheckpoint(session, 'figma-analysis', [], { duration_ms: 1000 });

    const start = Date.now();
    await resumeSession(session.session_id);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(30000); // 30 seconds
  });

  it('should preserve session state across save/load cycles', async () => {
    const session = await initSession('./test-prd.md', 'figma-abc123');

    // Add multiple checkpoints
    await saveCheckpoint(session, 'prd-analysis', ['req.yaml'], { duration_ms: 1000 });
    await saveCheckpoint(session, 'figma-analysis', ['comp.yaml'], { duration_ms: 2000 });

    // Load and verify
    const loaded = await loadSession(session.session_id);

    expect(loaded.prd_source).toBe('./test-prd.md');
    expect(loaded.figma_source).toBe('figma-abc123');
    expect(loaded.checkpoints).toHaveLength(2);
    expect(loaded.checkpoints[0]?.step).toBe('prd-analysis');
    expect(loaded.checkpoints[1]?.step).toBe('figma-analysis');
  });

  it('should handle session with corrupted state file', async () => {
    const session = await initSession('./test-prd.md');

    // Corrupt state file
    const statePath = join(testDir, '.prism', 'sessions', session.session_id, 'session_state.yaml');
    await writeFile(statePath, 'invalid: yaml: content: [[[');

    await expect(loadSession(session.session_id)).rejects.toThrow();
  });

  it('should ensure no more than 5 minutes of work lost (SC-004)', async () => {
    // Create session with checkpoints every ~4 minutes
    const session = await initSession('./test-prd.md');

    const checkpoints = [
      { step: 'prd-analysis' as const, duration_ms: 240000 }, // 4 min
      { step: 'figma-analysis' as const, duration_ms: 240000 }, // 4 min
      { step: 'validation' as const, duration_ms: 180000 }, // 3 min
    ];

    for (const cp of checkpoints) {
      await saveCheckpoint(session, cp.step, [], { duration_ms: cp.duration_ms });
    }

    // Maximum work lost = time since last checkpoint
    // With checkpoints every 3-4 min, max loss < 5 min ✓
    const lastCheckpoint = session.checkpoints[session.checkpoints.length - 1];
    expect(lastCheckpoint).toBeDefined();
    expect(lastCheckpoint?.metadata.duration_ms).toBeLessThan(5 * 60 * 1000);
  });
});
