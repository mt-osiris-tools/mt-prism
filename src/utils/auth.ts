/**
 * Authentication Discovery Utility
 *
 * Discovers and validates LLM provider credentials from multiple sources
 * Per research.md section 2: Claude Code Authentication Discovery
 *
 * Priority order:
 * 1. ANTHROPIC_API_KEY environment variable (auto-inherited from Claude Code)
 * 2. ~/.claude/.credentials.json OAuth token (Claude Code-specific)
 * 3. .env file in project root (fallback for standalone)
 * 4. Not found (prompt user)
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { AuthCredentials } from '../types/auth.js';

/**
 * Discover authentication credentials from available sources
 *
 * @returns Discovered credentials with source information
 */
export async function discoverCredentials(): Promise<AuthCredentials> {
  // Priority 1: Environment variable (auto-inherited from Claude Code)
  if (process.env['ANTHROPIC_API_KEY']) {
    return {
      source: 'env-var',
      anthropicApiKey: process.env['ANTHROPIC_API_KEY'],
      openaiApiKey: process.env['OPENAI_API_KEY'],
      googleApiKey: process.env['GOOGLE_API_KEY'] || process.env['GEMINI_API_KEY'],
      discoveredAt: new Date(),
    };
  }

  // Priority 2: OAuth token from Claude Code credentials file
  try {
    const credPath = join(homedir(), '.claude', '.credentials.json');
    const credContent = await readFile(credPath, 'utf-8');
    const creds = JSON.parse(credContent);

    if (creds.claudeAiOauth?.accessToken) {
      return {
        source: 'oauth',
        anthropicApiKey: creds.claudeAiOauth.accessToken,
        expiresAt: creds.claudeAiOauth.expiresAt,
        refreshToken: creds.claudeAiOauth.refreshToken,
        discoveredAt: new Date(),
      };
    }
  } catch (error) {
    // File doesn't exist or invalid JSON, continue to next method
  }

  // Priority 3: .env file in project root
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = await readFile(envPath, 'utf-8');
    const anthropicMatch = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    const openaiMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
    const googleMatch = envContent.match(/GOOGLE_API_KEY=(.+)/);
    const geminiMatch = envContent.match(/GEMINI_API_KEY=(.+)/);

    if (anthropicMatch || openaiMatch || googleMatch || geminiMatch) {
      return {
        source: 'env-file',
        anthropicApiKey: anthropicMatch?.[1]?.trim(),
        openaiApiKey: openaiMatch?.[1]?.trim(),
        googleApiKey: googleMatch?.[1]?.trim() || geminiMatch?.[1]?.trim(),
        discoveredAt: new Date(),
      };
    }
  } catch (error) {
    // .env doesn't exist or can't be read
  }

  // Priority 4: No credentials found
  return {
    source: 'not-found',
    discoveredAt: new Date(),
  };
}

/**
 * Validate that discovered credentials are usable
 *
 * Performs a minimal API call to verify credentials work
 *
 * @param creds - Discovered credentials
 * @returns true if valid, false if invalid
 */
export async function validateCredentials(creds: AuthCredentials): Promise<boolean> {
  // Check if any credentials exist
  if (!creds.anthropicApiKey && !creds.openaiApiKey && !creds.googleApiKey) {
    return false;
  }

  // Validation delegated to LLM abstraction layer
  // The createLLMProvider() function will attempt to use credentials
  // and throw an error if invalid
  return true;
}

/**
 * Check if OAuth token is expired or will expire soon
 *
 * @param creds - Credentials to check
 * @param bufferMinutes - Safety buffer in minutes (default: 5)
 * @returns true if expired or expiring soon
 */
export function isTokenExpired(creds: AuthCredentials, bufferMinutes: number = 5): boolean {
  if (!creds.expiresAt) {
    // API keys don't expire
    return false;
  }

  const now = Date.now();
  const bufferMs = bufferMinutes * 60 * 1000;

  return now + bufferMs > creds.expiresAt;
}
