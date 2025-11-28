/**
 * Session Cleanup Service
 *
 * Automatically removes old session data based on retention policy
 * Per research.md section 6: Session Cleanup Scheduling
 *
 * Triggers: On startup (7-day throttle) + on-demand command
 * Retention: 30 days default (configurable)
 */

import { readdir, stat, rm, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface CleanupResult {
  deletedCount: number;
  freedBytes: number;
  errors: string[];
}

/**
 * Get directory size recursively
 *
 * @param dirPath - Directory path
 * @returns Size in bytes
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else {
        const stats = await stat(fullPath);
        size += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors (permissions, missing files)
  }

  return size;
}

/**
 * Clean up old sessions based on retention policy
 *
 * @param retentionDays - Number of days to retain sessions (default: 30)
 * @returns Cleanup result with counts and errors
 */
export async function cleanupOldSessions(retentionDays: number = 30): Promise<CleanupResult> {
  const sessionsDir = join(process.cwd(), '.prism', 'sessions');
  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

  let deletedCount = 0;
  let freedBytes = 0;
  const errors: string[] = [];

  // Check if sessions directory exists
  if (!existsSync(sessionsDir)) {
    return { deletedCount: 0, freedBytes: 0, errors: [] };
  }

  try {
    const sessions = await readdir(sessionsDir);

    for (const sessionDir of sessions) {
      const sessionPath = join(sessionsDir, sessionDir);
      const statePath = join(sessionPath, 'session_state.yaml');

      try {
        // Check if session is active (has .running lock)
        const runningLockPath = join(sessionPath, '.running');
        if (existsSync(runningLockPath)) {
          continue; // Skip active sessions
        }

        // Check session age
        const stats = await stat(statePath);
        const age = now - stats.mtimeMs;

        if (age > retentionMs) {
          // Get size before deletion
          const size = await getDirectorySize(sessionPath);

          // Delete session
          await rm(sessionPath, { recursive: true, force: true });

          deletedCount++;
          freedBytes += size;
        }
      } catch (error) {
        errors.push(`${sessionDir}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    errors.push(`Sessions directory: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { deletedCount, freedBytes, errors };
}

/**
 * Maybe trigger cleanup based on throttling
 *
 * Only runs cleanup if >7 days since last cleanup
 *
 * @returns Cleanup result if triggered, null if throttled
 */
export async function maybeCleanupSessions(): Promise<CleanupResult | null> {
  const lastCleanupPath = join(process.cwd(), '.prism', '.last-cleanup');
  const throttleMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  try {
    const lastCleanupStr = await readFile(lastCleanupPath, 'utf-8');
    const lastCleanup = parseInt(lastCleanupStr, 10);

    if (Date.now() - lastCleanup < throttleMs) {
      return null; // Too recent, skip cleanup
    }
  } catch {
    // File doesn't exist, proceed with cleanup
  }

  // Execute cleanup
  const result = await cleanupOldSessions(30);

  // Save cleanup timestamp
  await writeFile(lastCleanupPath, Date.now().toString());

  return result;
}

/**
 * Format bytes for human-readable display
 *
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
