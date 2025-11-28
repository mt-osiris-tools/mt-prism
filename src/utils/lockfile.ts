/**
 * Workspace Lock Manager
 *
 * Prevents concurrent analyses using proper-lockfile with stale detection
 * Per research.md section 3: File Locking
 */

import * as lockfile from 'proper-lockfile';
import { stat } from 'fs/promises';
import { join } from 'path';

const LOCK_PATH = join(process.cwd(), '.prism', '.workspace.lock');
const STALE_THRESHOLD = 10000; // 10 seconds
const LOCK_OPTIONS = {
  stale: STALE_THRESHOLD,
  update: STALE_THRESHOLD / 2, // Update mtime every 5 seconds
  retries: {
    retries: 5,
    minTimeout: 100,
    maxTimeout: 1000,
  },
  realpath: true,
};

export interface LockManager {
  acquire(): Promise<(() => Promise<void>) | null>;
  release(releaseFn: () => Promise<void>): Promise<void>;
  isLocked(): Promise<boolean>;
  isStale(): Promise<boolean>;
  clearStale(): Promise<void>;
  waitFor(timeoutMs: number): Promise<boolean>;
}

/**
 * Workspace lock manager implementation
 */
export class WorkspaceLockManager implements LockManager {
  /**
   * Acquire workspace lock
   *
   * @returns Release function if successful, null if lock held by another process
   */
  async acquire(): Promise<(() => Promise<void>) | null> {
    try {
      const release = await lockfile.lock(LOCK_PATH, LOCK_OPTIONS);
      console.log('✅ Acquired workspace lock');
      return release;
    } catch (error) {
      // Lock is held by another process
      const stale = await this.isStale();
      if (stale) {
        console.log('🔧 Detected stale lock, clearing...');
        await this.clearStale();
        return this.acquire(); // Retry
      }
      return null;
    }
  }

  /**
   * Release workspace lock
   *
   * @param releaseFn - Release function from acquire()
   */
  async release(releaseFn: () => Promise<void>): Promise<void> {
    try {
      await releaseFn();
      console.log('🔓 Released workspace lock');
    } catch (error) {
      console.error('⚠️  Error releasing lock:', error);
    }
  }

  /**
   * Check if workspace is currently locked
   *
   * @returns true if locked, false otherwise
   */
  async isLocked(): Promise<boolean> {
    try {
      return await lockfile.check(LOCK_PATH, LOCK_OPTIONS);
    } catch (error) {
      // If check fails, assume unlocked
      return false;
    }
  }

  /**
   * Detect if lock is stale (process crashed, no mtime updates)
   *
   * @returns true if lock is stale (>10s since last update)
   */
  async isStale(): Promise<boolean> {
    try {
      const stats = await stat(LOCK_PATH);
      const ageMsec = Date.now() - stats.mtimeMs;
      return ageMsec > STALE_THRESHOLD;
    } catch {
      // Lock file doesn't exist or can't stat
      return false;
    }
  }

  /**
   * Clear stale lock
   */
  async clearStale(): Promise<void> {
    try {
      await lockfile.unlock(LOCK_PATH, LOCK_OPTIONS);
      console.log('✅ Stale lock cleared');
    } catch (error) {
      console.error('Failed to clear stale lock:', error);
    }
  }

  /**
   * Wait for lock to be released
   *
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @returns true if lock released, false if timeout
   */
  async waitFor(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (!(await this.isLocked())) {
        return true; // Lock released
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false; // Timeout
  }
}
