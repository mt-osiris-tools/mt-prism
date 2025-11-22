import { join } from 'path';
import {
  ensureDir,
  writeYAMLWithSchema,
  readYAMLWithSchema,
  fileExists,
} from './files.js';
import {
  SessionSchema,
  SessionStateSchema,
  CheckpointSchema,
} from '../schemas/session.js';
import type {
  Session,
  SessionState,
  Checkpoint,
  WorkflowStep,
} from '../types/session.js';
import { SessionError } from './errors.js';

/**
 * Session management utilities
 *
 * Per FR-050: Save checkpoints after each skill completes (5 checkpoints total)
 * Per NFR-012, NFR-014: Resumable from any interruption, persist across restarts
 */

const PRISM_DIR = join(process.cwd(), '.prism');
const SESSIONS_DIR = join(PRISM_DIR, 'sessions');

/**
 * Generate unique session ID
 * @returns Session ID in format sess-{timestamp}
 */
export function generateSessionId(): string {
  return `sess-${Date.now()}`;
}

/**
 * Get session directory path
 */
export function getSessionDir(sessionId: string): string {
  return join(SESSIONS_DIR, sessionId);
}

/**
 * Get session state file path
 */
export function getSessionStatePath(sessionId: string): string {
  return join(getSessionDir(sessionId), 'session_state.yaml');
}

/**
 * Initialize new session
 *
 * @param prdSource - PRD source (URL or file path)
 * @param figmaSource - Optional Figma source
 * @returns Initialized session
 */
export async function initSession(
  prdSource: string,
  figmaSource?: string
): Promise<Session> {
  const sessionId = generateSessionId();
  const now = new Date().toISOString();

  const session: Session = {
    session_id: sessionId,
    current_step: 'prd-analysis',
    status: 'in-progress',
    created_at: now,
    updated_at: now,
    prd_source: prdSource,
    figma_source,
    outputs: {},
    checkpoints: [],
    config: {
      ai_provider: process.env.AI_PROVIDER || 'anthropic',
      workflow_timeout_minutes: parseInt(
        process.env.WORKFLOW_TIMEOUT_MINUTES || '20',
        10
      ),
      max_clarification_iterations: parseInt(
        process.env.MAX_CLARIFICATION_ITERATIONS || '3',
        10
      ),
    },
  };

  // Create session directory structure
  const sessionDir = getSessionDir(sessionId);
  await ensureDir(sessionDir);
  await ensureDir(join(sessionDir, '01-prd-analysis'));
  await ensureDir(join(sessionDir, '02-figma-analysis'));
  await ensureDir(join(sessionDir, '03-validation'));
  await ensureDir(join(sessionDir, '04-clarification'));
  await ensureDir(join(sessionDir, '05-tdd'));

  // Save initial state
  await saveSession(session);

  return session;
}

/**
 * Save session state atomically
 *
 * @param session - Session to save
 */
export async function saveSession(session: Session): Promise<void> {
  const state: SessionState = {
    session,
    version: '1.0',
    last_checkpoint: session.checkpoints[session.checkpoints.length - 1],
  };

  const statePath = getSessionStatePath(session.session_id);
  await writeYAMLWithSchema(statePath, state, SessionStateSchema);
}

/**
 * Load session state
 *
 * @param sessionId - Session ID to load
 * @returns Session state
 * @throws SessionError if session doesn't exist or is corrupted
 */
export async function loadSession(sessionId: string): Promise<Session> {
  const statePath = getSessionStatePath(sessionId);

  if (!(await fileExists(statePath))) {
    throw new SessionError(
      `Session file not found at ${statePath}`,
      sessionId
    );
  }

  try {
    const state = await readYAMLWithSchema(statePath, SessionStateSchema);
    return state.session;
  } catch (error) {
    throw new SessionError(
      `Failed to load or validate session state: ${
        error instanceof Error ? error.message : String(error)
      }`,
      sessionId
    );
  }
}

/**
 * Save checkpoint after skill completes (FR-050)
 *
 * One of 5 checkpoints: prd-analysis, figma-analysis, validation, clarification, tdd-generation
 *
 * @param session - Current session
 * @param step - Completed workflow step
 * @param outputs - Output file paths from this step
 * @param metadata - Execution metadata
 * @returns Updated session
 */
export async function saveCheckpoint(
  session: Session,
  step: WorkflowStep,
  outputs: string[],
  metadata: {
    duration_ms: number;
    provider_used?: string;
    estimated_cost?: number;
  }
): Promise<Session> {
  const checkpoint: Checkpoint = {
    step,
    timestamp: new Date().toISOString(),
    outputs,
    metadata,
  };

  // Validate checkpoint
  CheckpointSchema.parse(checkpoint);

  // Update session
  session.checkpoints.push(checkpoint);
  session.current_step = step;
  session.updated_at = checkpoint.timestamp;

  // Save atomically
  await saveSession(session);

  return session;
}

/**
 * Resume session from last checkpoint
 *
 * Per FR-053: Allow resuming from last successful checkpoint
 *
 * @param sessionId - Session to resume
 * @returns Session ready to continue from last checkpoint
 */
export async function resumeSession(sessionId: string): Promise<Session> {
  const session = await loadSession(sessionId);

  if (session.status === 'completed') {
    throw new SessionError('Cannot resume completed session', sessionId);
  }

  if (session.status === 'failed') {
    // Allow resume from failed state (recover from error)
    session.status = 'in-progress';
    session.updated_at = new Date().toISOString();
    await saveSession(session);
  }

  return session;
}

/**
 * Mark session as completed
 */
export async function completeSession(session: Session): Promise<void> {
  session.status = 'completed';
  session.updated_at = new Date().toISOString();
  await saveSession(session);
}

/**
 * Mark session as failed
 */
export async function failSession(
  session: Session,
  error: Error
): Promise<void> {
  session.status = 'failed';
  session.updated_at = new Date().toISOString();

  // Store error information
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };

  // Write error to session directory
  const sessionDir = getSessionDir(session.session_id);
  const errorPath = join(sessionDir, 'error.json');

  const fs = await import('fs/promises');
  await fs.writeFile(errorPath, JSON.stringify(errorInfo, null, 2));

  await saveSession(session);
}

/**
 * List all sessions
 *
 * @returns Array of session IDs
 */
export async function listSessions(): Promise<string[]> {
  const fs = await import('fs/promises');

  try {
    const entries = await fs.readdir(SESSIONS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name.startsWith('sess-'));
  } catch (error) {
    // Return empty array if sessions directory doesn't exist
    return [];
  }
}
