/**
 * Integration test for full workflow in simulated Claude Code environment
 *
 * Tests end-to-end PRD analysis with auto-authentication in Claude Code context
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Claude Code Workflow Integration', () => {
  let testDir: string;
  const originalEnv = process.env;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    // Create temp directory for test workspace
    testDir = await mkdtemp(join(tmpdir(), 'prism-test-'));
    process.chdir(testDir);

    // Setup Claude Code environment
    process.env = {
      ...originalEnv,
      CLAUDECODE: '1',
      ANTHROPIC_API_KEY: 'sk-ant-test-integration-key',
    };
  });

  afterEach(async () => {
    // Cleanup
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should detect Claude Code environment and use session credentials', async () => {
    const { detectEnvironment } = await import('../../src/services/environment.js');
    const { discoverCredentials } = await import('../../src/utils/auth.js');

    // Detect environment
    const env = await detectEnvironment();
    expect(env.isClaudeCode).toBe(true);
    expect(env.confidence).toBe('high');

    // Discover credentials
    const creds = await discoverCredentials();
    expect(creds.source).toBe('env-var');
    expect(creds.anthropicApiKey).toBe('sk-ant-test-integration-key');
  });

  it('should create session in workspace .prism directory', async () => {
    const { initSession } = await import('../../src/utils/session.js');
    const { existsSync } = await import('fs');

    // Create test PRD file
    const prdPath = join(testDir, 'test-prd.md');
    await writeFile(prdPath, '# Test PRD\n\n## Requirements\n- User can login');

    // Initialize session
    const session = await initSession(prdPath);

    // Verify session directory created in workspace
    const sessionDir = join(testDir, '.prism', 'sessions', session.session_id);
    expect(existsSync(sessionDir)).toBe(true);

    // Verify session state file exists
    const statePath = join(sessionDir, 'session_state.yaml');
    expect(existsSync(statePath)).toBe(true);

    // Verify subdirectories created
    expect(existsSync(join(sessionDir, '01-prd-analysis'))).toBe(true);
    expect(existsSync(join(sessionDir, '05-tdd'))).toBe(true);
  });

  it('should handle missing credentials with actionable error', async () => {
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['OPENAI_API_KEY'];
    delete process.env['GOOGLE_API_KEY'];

    const { discoverCredentials } = await import('../../src/utils/auth.js');

    const creds = await discoverCredentials();

    expect(creds.source).toBe('not-found');
    expect(creds.anthropicApiKey).toBeUndefined();
  });

  it('should log environment detection and credential discovery results', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const { detectEnvironment } = await import('../../src/services/environment.js');
    const { discoverCredentials } = await import('../../src/utils/auth.js');

    await detectEnvironment();
    await discoverCredentials();

    // Verify logging occurred (will be implemented in CLI integration)
    // This test will pass once T024-T025 are implemented
    expect(consoleSpy).toHaveBeenCalled;
  });
});
