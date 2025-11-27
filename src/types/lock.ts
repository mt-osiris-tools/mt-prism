/**
 * Workspace Lock Types
 *
 * Defines lock file structure for preventing concurrent analyses
 */

export interface WorkspaceLock {
  /** Workspace path being locked */
  workspacePath: string;

  /** Session ID holding the lock */
  sessionId: string;

  /** Process ID holding the lock */
  pid: number;

  /** When lock was acquired */
  acquiredAt: Date;

  /** Stale lock threshold (2x timeout = 60 min) */
  expiresAt: Date;
}
