/**
 * Session entity
 *
 * Represents a workflow execution instance
 * Per spec.md Key Entities (line 253), enhanced with clarification (line 267)
 */

export type WorkflowStep =
  | 'prd-analysis'
  | 'figma-analysis'
  | 'validation'
  | 'clarification'
  | 'tdd-generation';

export type SessionStatus = 'in-progress' | 'paused' | 'completed' | 'failed';

/**
 * Checkpoint saved after each skill completes (per FR-050)
 */
export interface Checkpoint {
  /** Which skill completed */
  step: WorkflowStep;

  /** When checkpoint was created */
  timestamp: string; // ISO8601

  /** Paths to output files from this step */
  outputs: string[];

  /** Execution metadata (duration, tokens used, cost, etc.) */
  metadata: {
    duration_ms: number;
    provider_used?: string;
    estimated_cost?: number;
  };
}

/**
 * Session output paths
 */
export interface SessionOutputs {
  requirements_yaml?: string;
  components_yaml?: string;
  validation_report?: string;
  gaps_yaml?: string;
  questions_md?: string;
  clarification_summary?: string;
  tdd_md?: string;
  api_spec_yaml?: string;
  database_schema_sql?: string;
}

/**
 * Workflow execution session
 *
 * Tracks state for resume capability (NFR-012, NFR-014)
 */
export interface Session {
  /** Unique session ID (sess-{timestamp}) */
  session_id: string;

  /** Current workflow step */
  current_step: WorkflowStep;

  /** Session status */
  status: SessionStatus;

  /** Creation timestamp */
  created_at: string; // ISO8601

  /** Last update timestamp */
  updated_at: string; // ISO8601

  /** PRD source (URL or file path) */
  prd_source: string;

  /** Figma source (URL or file ID, optional) */
  figma_source?: string;

  /** Output file paths */
  outputs: SessionOutputs;

  /** Checkpoint history (5 checkpoints max per FR-050) */
  checkpoints: Checkpoint[];

  /** Configuration snapshot */
  config: {
    ai_provider: string;
    workflow_timeout_minutes: number;
    max_clarification_iterations: number;
  };
}

/**
 * Session state file format
 *
 * Saved to .prism/sessions/{session_id}/session_state.yaml
 */
export interface SessionState {
  session: Session;
  version: string; // Session state schema version
  last_checkpoint?: Checkpoint;
}
