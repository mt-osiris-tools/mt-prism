/**
 * Claude Code Environment Detection Types
 *
 * Defines the structure for detecting and representing Claude Code execution context
 */

export interface ClaudeCodeEnvironment {
  /** Whether running in Claude Code (vs. standalone terminal) */
  isClaudeCode: boolean;

  /** Detection confidence level */
  confidence: 'high' | 'medium' | 'low' | 'none';

  /** Method used for detection */
  method: string;

  /** Current workspace path */
  workspacePath: string;

  /** Whether authentication credentials are available */
  authAvailable: boolean;

  /** List of available MCP servers */
  mcpServers: string[];

  /** When environment was detected */
  detectedAt: Date;
}
