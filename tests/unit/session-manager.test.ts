/**
 * Unit tests for session manager
 *
 * Tests session CRUD operations, YAML format, and resume capability
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import {
  initSession,
  saveSession,
  loadSession,
  resumeSession,
  completeSession,
  failSession,
  saveCheckpoint,
  listSessions,
} from '../../src/utils/session.js';

describe('Session Manager', () => {
  let testDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'prism-session-test-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('initSession', () => {
    it('should create session with correct structure', async () => {
      const session = await initSession('./test-prd.md', 'figma-123');

      expect(session.session_id).toMatch(/^sess-\d+$/);
      expect(session.current_step).toBe('prd-analysis');
      expect(session.status).toBe('in-progress');
      expect(session.prd_source).toBe('./test-prd.md');
      expect(session.figma_source).toBe('figma-123');
      expect(session.checkpoints).toEqual([]);
    });

    it('should create session directory in .prism/sessions/ (FR-003)', async () => {
      const session = await initSession('./test-prd.md');

      const sessionDir = join(testDir, '.prism', 'sessions', session.session_id);
      expect(existsSync(sessionDir)).toBe(true);
    });

    it('should create all workflow subdirectories', async () => {
      const session = await initSession('./test-prd.md');
      const sessionDir = join(testDir, '.prism', 'sessions', session.session_id);

      expect(existsSync(join(sessionDir, '01-prd-analysis'))).toBe(true);
      expect(existsSync(join(sessionDir, '02-figma-analysis'))).toBe(true);
      expect(existsSync(join(sessionDir, '03-validation'))).toBe(true);
      expect(existsSync(join(sessionDir, '04-clarification'))).toBe(true);
      expect(existsSync(join(sessionDir, '05-tdd'))).toBe(true);
    });

    it('should save session state to session_state.yaml', async () => {
      const session = await initSession('./test-prd.md');

      const statePath = join(testDir, '.prism', 'sessions', session.session_id, 'session_state.yaml');
      expect(existsSync(statePath)).toBe(true);
    });
  });

  describe('saveSession and loadSession', () => {
    it('should save and load session state with YAML format', async () => {
      const session = await initSession('./test-prd.md');
      session.current_step = 'validation';
      session.checkpoints.push({
        step: 'prd-analysis',
        timestamp: new Date().toISOString(),
        outputs: ['requirements.yaml'],
        metadata: { duration_ms: 1000 },
      });

      await saveSession(session);
      const loaded = await loadSession(session.session_id);

      expect(loaded.session_id).toBe(session.session_id);
      expect(loaded.current_step).toBe('validation');
      expect(loaded.checkpoints).toHaveLength(1);
      expect(loaded.checkpoints[0]?.step).toBe('prd-analysis');
    });

    it('should throw error when loading non-existent session', async () => {
      await expect(loadSession('sess-invalid')).rejects.toThrow('Session file not found');
    });

    it('should complete save/load cycle in under 500ms', async () => {
      const session = await initSession('./test-prd.md');

      const start = Date.now();
      await saveSession(session);
      await loadSession(session.session_id);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('saveCheckpoint', () => {
    it('should add checkpoint to session and save state', async () => {
      const session = await initSession('./test-prd.md');

      const updated = await saveCheckpoint(
        session,
        'prd-analysis',
        ['requirements.yaml'],
        { duration_ms: 2000, provider_used: 'claude' }
      );

      expect(updated.checkpoints).toHaveLength(1);
      expect(updated.checkpoints[0]?.step).toBe('prd-analysis');
      expect(updated.checkpoints[0]?.metadata.duration_ms).toBe(2000);
      expect(updated.current_step).toBe('prd-analysis');
    });

    it('should persist checkpoint after save', async () => {
      const session = await initSession('./test-prd.md');
      await saveCheckpoint(session, 'prd-analysis', [], { duration_ms: 1000 });

      const loaded = await loadSession(session.session_id);
      expect(loaded.checkpoints).toHaveLength(1);
    });
  });

  describe('resumeSession', () => {
    it('should resume paused session', async () => {
      const session = await initSession('./test-prd.md');
      session.status = 'paused';
      await saveSession(session);

      const resumed = await resumeSession(session.session_id);

      expect(resumed.session_id).toBe(session.session_id);
      expect(resumed.status).toBe('paused');
    });

    it('should allow resume from failed state', async () => {
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

      await expect(resumeSession(session.session_id)).rejects.toThrow('Cannot resume completed session');
    });
  });

  describe('completeSession and failSession', () => {
    it('should mark session as completed', async () => {
      const session = await initSession('./test-prd.md');
      await completeSession(session);

      const loaded = await loadSession(session.session_id);
      expect(loaded.status).toBe('completed');
    });

    it('should mark session as failed and save error', async () => {
      const session = await initSession('./test-prd.md');
      const error = new Error('Test error');

      await failSession(session, error);

      const loaded = await loadSession(session.session_id);
      expect(loaded.status).toBe('failed');

      // Verify error file created
      const errorPath = join(testDir, '.prism', 'sessions', session.session_id, 'error.json');
      expect(existsSync(errorPath)).toBe(true);
    });
  });

  describe('listSessions', () => {
    it('should return empty array when no sessions exist', async () => {
      const sessions = await listSessions();
      expect(sessions).toEqual([]);
    });

    it('should list all session IDs', async () => {
      await initSession('./test-prd-1.md');
      await initSession('./test-prd-2.md');
      await initSession('./test-prd-3.md');

      const sessions = await listSessions();
      expect(sessions).toHaveLength(3);
      expect(sessions.every((s) => s.startsWith('sess-'))).toBe(true);
    });
  });

  describe('resumeSession - T033 Unit Test', () => {
    it('should detect last completed step from checkpoints', async () => {
      const session = await initSession('./test-prd.md');
      await saveCheckpoint(session, 'prd-analysis', [], { duration_ms: 1000 });
      await saveCheckpoint(session, 'figma-analysis', [], { duration_ms: 1000 });

      const resumed = await resumeSession(session.session_id);

      expect(resumed.checkpoints).toHaveLength(2);
      expect(resumed.current_step).toBe('figma-analysis');
    });

    it('should resume paused session without changing state', async () => {
      const session = await initSession('./test-prd.md');
      session.status = 'paused';
      session.current_step = 'validation';
      await saveSession(session);

      const resumed = await resumeSession(session.session_id);

      expect(resumed.status).toBe('paused');
      expect(resumed.current_step).toBe('validation');
    });

    it('should resume failed session and reset to in-progress', async () => {
      const session = await initSession('./test-prd.md');
      session.status = 'failed';
      await saveSession(session);

      const resumed = await resumeSession(session.session_id);

      expect(resumed.status).toBe('in-progress');
    });

    it('should load session state in under 30 seconds', async () => {
      const session = await initSession('./test-prd.md');

      const start = Date.now();
      await resumeSession(session.session_id);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(30000);
    });
  });
});
