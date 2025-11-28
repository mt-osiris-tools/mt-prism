/**
 * Unit tests for authentication discovery
 *
 * Tests priority-ordered credential discovery from multiple sources
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { discoverCredentials, validateCredentials, isTokenExpired } from '../../src/utils/auth.js';
import { readFile } from 'fs/promises';

vi.mock('fs/promises');

describe('Authentication Discovery', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('discoverCredentials', () => {
    it('should discover credentials from environment variable (Priority 1)', async () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-123';
      process.env['OPENAI_API_KEY'] = 'sk-openai-test-456';

      const creds = await discoverCredentials();

      expect(creds.source).toBe('env-var');
      expect(creds.anthropicApiKey).toBe('sk-ant-test-123');
      expect(creds.openaiApiKey).toBe('sk-openai-test-456');
      expect(creds.discoveredAt).toBeInstanceOf(Date);
    });

    it('should discover OAuth token from Claude credentials file (Priority 2)', async () => {
      delete process.env['ANTHROPIC_API_KEY'];

      const mockCredentials = JSON.stringify({
        claudeAiOauth: {
          accessToken: 'sk-ant-oat01-test-token',
          refreshToken: 'sk-ant-ort01-refresh',
          expiresAt: Date.now() + 3600000, // 1 hour from now
        },
      });

      vi.mocked(readFile).mockResolvedValueOnce(mockCredentials);

      const creds = await discoverCredentials();

      expect(creds.source).toBe('oauth');
      expect(creds.anthropicApiKey).toBe('sk-ant-oat01-test-token');
      expect(creds.expiresAt).toBeDefined();
      expect(creds.refreshToken).toBe('sk-ant-ort01-refresh');
    });

    it('should discover credentials from .env file (Priority 3)', async () => {
      delete process.env['ANTHROPIC_API_KEY'];

      // Mock OAuth file not found
      vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'));

      // Mock .env file
      const mockEnvContent = 'ANTHROPIC_API_KEY=sk-ant-from-env\nOPENAI_API_KEY=sk-openai-from-env';
      vi.mocked(readFile).mockResolvedValueOnce(mockEnvContent);

      const creds = await discoverCredentials();

      expect(creds.source).toBe('env-file');
      expect(creds.anthropicApiKey).toBe('sk-ant-from-env');
      expect(creds.openaiApiKey).toBe('sk-openai-from-env');
    });

    it('should return not-found when no credentials available', async () => {
      delete process.env['ANTHROPIC_API_KEY'];

      // Mock all file reads failing
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

      const creds = await discoverCredentials();

      expect(creds.source).toBe('not-found');
      expect(creds.anthropicApiKey).toBeUndefined();
    });

    it('should support GEMINI_API_KEY as alias for GOOGLE_API_KEY', async () => {
      process.env['GEMINI_API_KEY'] = 'gemini-test-key';

      const creds = await discoverCredentials();

      expect(creds.googleApiKey).toBe('gemini-test-key');
    });

    it('should complete credential discovery in under 50ms', async () => {
      process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-123';

      const start = Date.now();
      await discoverCredentials();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('validateCredentials', () => {
    it('should return false when no credentials exist', async () => {
      const creds = {
        source: 'not-found' as const,
        discoveredAt: new Date(),
      };

      const isValid = await validateCredentials(creds);

      expect(isValid).toBe(false);
    });

    it('should return true when any credential exists', async () => {
      const creds = {
        source: 'env-var' as const,
        anthropicApiKey: 'sk-ant-test-123',
        discoveredAt: new Date(),
      };

      const isValid = await validateCredentials(creds);

      expect(isValid).toBe(true);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for API keys (no expiration)', () => {
      const creds = {
        source: 'env-var' as const,
        anthropicApiKey: 'sk-ant-test-123',
        discoveredAt: new Date(),
      };

      expect(isTokenExpired(creds)).toBe(false);
    });

    it('should return true for expired OAuth tokens', () => {
      const creds = {
        source: 'oauth' as const,
        anthropicApiKey: 'sk-ant-oat01-test',
        expiresAt: Date.now() - 1000, // 1 second ago
        discoveredAt: new Date(),
      };

      expect(isTokenExpired(creds)).toBe(true);
    });

    it('should return true for tokens expiring within buffer period', () => {
      const creds = {
        source: 'oauth' as const,
        anthropicApiKey: 'sk-ant-oat01-test',
        expiresAt: Date.now() + (4 * 60 * 1000), // 4 minutes from now
        discoveredAt: new Date(),
      };

      expect(isTokenExpired(creds, 5)).toBe(true); // 5 minute buffer
    });

    it('should return false for tokens with sufficient time remaining', () => {
      const creds = {
        source: 'oauth' as const,
        anthropicApiKey: 'sk-ant-oat01-test',
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes from now
        discoveredAt: new Date(),
      };

      expect(isTokenExpired(creds, 5)).toBe(false); // 5 minute buffer
    });
  });
});
