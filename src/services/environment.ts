/**
 * Environment Detection Service
 *
 * Detects Claude Code execution context using multi-method detection strategy
 * Per research.md section 1: Environment Detection
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ClaudeCodeEnvironment } from '../types/environment.js';

/**
 * Detect available MCP servers from environment
 */
function detectMCPServers(): string[] {
  const mcpServers: string[] = [];

  // Check for MCP-related environment variables
  if (process.env['ATLASSIAN_API_TOKEN']) mcpServers.push('confluence');
  if (process.env['FIGMA_API_KEY']) mcpServers.push('figma');
  if (process.env['JIRA_API_TOKEN']) mcpServers.push('jira');
  if (process.env['SLACK_BOT_TOKEN']) mcpServers.push('slack');

  return mcpServers;
}

/**
 * Detect if running in Claude Code environment
 *
 * Uses multi-method detection with confidence scoring:
 * 1. Check for explicit environment marker (CLAUDECODE=1)
 * 2. Detect parent process name via platform-specific commands
 * 3. Check for configuration markers in home directory
 * 4. Fall back to standalone mode
 *
 * @returns Environment detection result with confidence level
 */
export async function detectEnvironment(): Promise<ClaudeCodeEnvironment> {
  const workspacePath = process.cwd();
  const authAvailable = !!process.env['ANTHROPIC_API_KEY'];
  const mcpServers = detectMCPServers();

  // Method 1: Check explicit marker (highest confidence)
  if (process.env['CLAUDECODE'] === '1') {
    return {
      isClaudeCode: true,
      confidence: 'high',
      method: 'env-marker-explicit',
      workspacePath,
      authAvailable,
      mcpServers,
      detectedAt: new Date(),
    };
  }

  // Method 2: Parent process name detection
  try {
    const ppid = process.ppid;
    let parentName = '';

    if (process.platform === 'darwin' || process.platform === 'linux') {
      parentName = execSync(`ps -p ${ppid} -o comm=`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
    } else if (process.platform === 'win32') {
      const output = execSync(`wmic process where (ProcessId=${ppid}) get ExecutablePath`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      parentName = output;
    }

    if (parentName.includes('claude') || parentName.includes('node')) {
      return {
        isClaudeCode: true,
        confidence: 'medium',
        method: 'parent-process-name',
        workspacePath,
        authAvailable,
        mcpServers,
        detectedAt: new Date(),
      };
    }
  } catch (error) {
    // Continue to next method if process inspection fails
  }

  // Method 3: Check for Claude config directory
  const claudeConfigPath = join(homedir(), '.claude');
  if (existsSync(claudeConfigPath)) {
    return {
      isClaudeCode: false, // Low confidence, just marker
      confidence: 'low',
      method: 'config-directory',
      workspacePath,
      authAvailable,
      mcpServers: [],
      detectedAt: new Date(),
    };
  }

  // No detection succeeded
  return {
    isClaudeCode: false,
    confidence: 'none',
    method: 'none',
    workspacePath,
    authAvailable,
    mcpServers: [],
    detectedAt: new Date(),
  };
}

/**
 * Check if currently running in Claude Code
 *
 * Convenience method for simple boolean check
 */
export function isClaudeCode(env: ClaudeCodeEnvironment): boolean {
  return env.isClaudeCode && (env.confidence === 'high' || env.confidence === 'medium');
}

/**
 * Get workspace path from environment
 */
export function getWorkspacePath(env: ClaudeCodeEnvironment): string {
  return env.workspacePath;
}

/**
 * Get available MCP servers
 */
export function getMCPServers(env: ClaudeCodeEnvironment): string[] {
  return env.mcpServers;
}
