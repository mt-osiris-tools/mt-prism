/**
 * Gap entity
 *
 * Represents an inconsistency or missing element between requirements and designs
 * Per spec.md Key Entities (line 249)
 */

export type GapType =
  | 'missing_ui'
  | 'no_requirement'
  | 'incomplete_mapping'
  | 'inconsistency'
  | 'missing_acceptance_criteria';

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

export type StakeholderType = 'product' | 'design' | 'engineering';

/**
 * Gap between requirements and designs
 */
export interface Gap {
  /** Unique ID (GAP-001, GAP-002, etc.) */
  id: string;

  /** Type of gap */
  type: GapType;

  /** Severity level */
  severity: GapSeverity;

  /** Related requirement ID (if applicable) */
  requirement_id?: string;

  /** Related component ID (if applicable) */
  component_id?: string;

  /** Gap description */
  description: string;

  /** Stakeholders who should address this gap */
  stakeholder: StakeholderType[];

  /** Related clarification question ID */
  question_id?: string;
}

/**
 * Gaps output from Requirements Validator
 */
export interface GapsOutput {
  metadata: {
    validated_at: string; // ISO8601
    validator_version?: string;
    total_gaps: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  };
  gaps: Gap[];
}
