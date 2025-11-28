/**
 * Workflow Timeout Manager
 *
 * Enforces maximum execution time with graceful shutdown capability
 * Per research.md section 5: Timeout Implementation
 *
 * Uses AbortController for clean signal propagation through async operations
 */

/**
 * Workflow timeout manager using AbortController
 */
export class WorkflowTimeoutManager {
  private controller: AbortController;
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly timeoutMs: number;

  /**
   * @param timeoutMinutes - Timeout duration in minutes (default: 30)
   */
  constructor(timeoutMinutes: number = 30) {
    this.controller = new AbortController();
    this.timeoutMs = timeoutMinutes * 60 * 1000;
  }

  /**
   * Start timeout timer with optional cleanup callback
   *
   * @param onTimeout - Callback executed BEFORE abort signal (for state saving)
   */
  start(onTimeout?: () => Promise<void>): void {
    this.timeoutId = setTimeout(async () => {
      console.warn(`⏱️  Workflow timeout (${this.timeoutMs / 60000} minutes) reached`);

      // Execute cleanup callback BEFORE aborting
      if (onTimeout) {
        try {
          await onTimeout();
        } catch (error) {
          console.error('Error during timeout cleanup:', error);
        }
      }

      // Trigger abort
      this.controller.abort(new Error('Workflow timeout exceeded'));
    }, this.timeoutMs);
  }

  /**
   * Get abort signal for passing to async operations
   *
   * @returns AbortSignal to pass through workflow steps
   */
  getSignal(): AbortSignal {
    return this.controller.signal;
  }

  /**
   * Check if timeout has been triggered
   *
   * @returns true if aborted
   */
  isAborted(): boolean {
    return this.controller.signal.aborted;
  }

  /**
   * Cancel timeout (call on workflow success)
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Force abort immediately
   *
   * @param reason - Reason for abort
   */
  abort(reason?: string): void {
    this.cancel();
    this.controller.abort(new Error(reason || 'Workflow aborted'));
  }
}
