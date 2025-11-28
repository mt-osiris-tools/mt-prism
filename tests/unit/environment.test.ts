/**
 * Unit tests for environment detection
 *
 * Tests multi-method Claude Code detection with mocked environment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectEnvironment, isClaudeCode } from '../../src/services/environment.js';

describe('Environment Detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('detectEnvironment', () => {
    it('should detect Claude Code via explicit marker with high confidence', async () => {
      process.env['CLAUDECODE'] = '1';
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-123';

      const env = await detectEnvironment();

      expect(env.isClaudeCode).toBe(true);
      expect(env.confidence).toBe('high');
      expect(env.method).toBe('env-marker-explicit');
      expect(env.authAvailable).toBe(true);
      expect(env.workspacePath).toBe(process.cwd());
    });

    it('should detect Claude Code via parent process name with medium confidence', async () => {
      delete process.env['CLAUDECODE'];
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-123';

      // Mock execSync to return 'claude' as parent process
      vi.spyOn(await import('child_process'), 'execSync').mockReturnValue('claude\n' as any);

      const env = await detectEnvironment();

      expect(env.isClaudeCode).toBe(true);
      expect(env.confidence).toBe('medium');
      expect(env.method).toBe('parent-process-name');
    });

    it('should return low confidence when only config directory exists', async () => {
      delete process.env['CLAUDECODE'];
      delete process.env['ANTHROPIC_API_KEY'];

      // Mock existsSync to return true for .claude directory
      const fs = await import('fs');
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const env = await detectEnvironment();

      expect(env.isClaudeCode).toBe(false);
      expect(env.confidence).toBe('low');
      expect(env.method).toBe('config-directory');
    });

    it('should return none confidence when no detection methods succeed', async () => {
      delete process.env['CLAUDECODE'];
      delete process.env['ANTHROPIC_API_KEY'];

      const env = await detectEnvironment();

      expect(env.isClaudeCode).toBe(false);
      expect(env.confidence).toBe('none');
      expect(env.method).toBe('none');
      expect(env.authAvailable).toBe(false);
    });

    it('should detect MCP servers from environment variables', async () => {
      process.env['CLAUDECODE'] = '1';
      process.env['ATLASSIAN_API_TOKEN'] = 'token1';
      process.env['FIGMA_API_KEY'] = 'token2';
      process.env['JIRA_API_TOKEN'] = 'token3';

      const env = await detectEnvironment();

      expect(env.mcpServers).toEqual(['confluence', 'figma', 'jira']);
    });

    it('should complete detection in under 100ms', async () => {
      const start = Date.now();
      await detectEnvironment();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('isClaudeCode', () => {
    it('should return true for high confidence detection', () => {
      const env = {
        isClaudeCode: true,
        confidence: 'high' as const,
        method: 'env-marker-explicit',
        workspacePath: '/test',
        authAvailable: true,
        mcpServers: [],
        detectedAt: new Date(),
      };

      expect(isClaudeCode(env)).toBe(true);
    });

    it('should return true for medium confidence detection', () => {
      const env = {
        isClaudeCode: true,
        confidence: 'medium' as const,
        method: 'parent-process-name',
        workspacePath: '/test',
        authAvailable: true,
        mcpServers: [],
        detectedAt: new Date(),
      };

      expect(isClaudeCode(env)).toBe(true);
    });

    it('should return false for low confidence detection', () => {
      const env = {
        isClaudeCode: false,
        confidence: 'low' as const,
        method: 'config-directory',
        workspacePath: '/test',
        authAvailable: false,
        mcpServers: [],
        detectedAt: new Date(),
      };

      expect(isClaudeCode(env)).toBe(false);
    });
  });
});
