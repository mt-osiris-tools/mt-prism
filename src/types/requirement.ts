/**
 * Requirement entity
 *
 * Represents a single functional or non-functional requirement extracted from PRD
 * Per spec.md Key Entities (line 245)
 */

export type RequirementType =
  | 'functional'
  | 'performance'
  | 'security'
  | 'constraint';

export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';

export type RequirementStatus = 'draft' | 'validated' | 'clarified' | 'approved';

export type RequirementIssueType =
  | 'ambiguity'
  | 'missing'
  | 'conflict'
  | 'incomplete';

export type RequirementIssueSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Issue detected in a requirement
 */
export interface RequirementIssue {
  type: RequirementIssueType;
  severity: RequirementIssueSeverity;
  description: string;
  suggestion?: string;
}

/**
 * Requirement extracted from PRD
 */
export interface Requirement {
  /** Unique ID (REQ-FUNC-001, REQ-PERF-001, etc.) */
  id: string;

  /** Requirement type */
  type: RequirementType;

  /** Category (feature, enhancement, performance, security, etc.) */
  category?: string;

  /** Priority level */
  priority: RequirementPriority;

  /** Complexity estimate (1-10 scale) */
  complexity: number;

  /** Requirement title */
  title: string;

  /** Detailed description */
  description: string;

  /** Acceptance criteria (testable conditions) */
  acceptance_criteria: string[];

  /** Related user stories */
  user_stories?: string[];

  /** Dependencies on other requirements (requirement IDs) */
  dependencies: string[];

  /** Source location in PRD */
  source_location?: string;

  /** Extraction confidence (0.0-1.0) */
  confidence: number;

  /** Current status */
  status: RequirementStatus;

  /** Detected issues */
  issues: RequirementIssue[];
}

/**
 * Requirements output from PRD Analyzer
 */
export interface RequirementsOutput {
  metadata: {
    prd_source: string;
    analyzed_at: string; // ISO8601
    analyzer_version?: string;
    total_requirements: number;
  };
  requirements: Requirement[];
}
