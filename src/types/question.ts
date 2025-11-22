/**
 * Clarification Question entity
 *
 * Represents a question needing stakeholder input
 * Per spec.md Key Entities (line 251)
 */

import type { GapSeverity, StakeholderType } from './gap.js';

/**
 * Clarification question for stakeholders
 */
export interface ClarificationQuestion {
  /** Unique ID (Q-001, Q-002, etc.) */
  id: string;

  /** Priority level */
  priority: GapSeverity;

  /** Target stakeholder type */
  stakeholder_type: StakeholderType;

  /** Question text */
  question: string;

  /** Context for the question */
  context: string;

  /** Suggested answers or options */
  suggestions: string[];

  /** Stakeholder response (filled after clarification) */
  response?: string;

  /** Confidence in response (0.0-1.0, only valid if response present) */
  confidence?: number;

  /** Related gap ID */
  gap_id: string;
}

/**
 * Clarification questions output from Requirements Validator
 */
export interface QuestionsOutput {
  metadata: {
    generated_at: string; // ISO8601
    total_questions: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  };
  questions: ClarificationQuestion[];
}

/**
 * Clarification response from stakeholder
 */
export interface ClarificationResponse {
  question_id: string;
  response: string;
  confidence: number;
  answered_by?: string;
  answered_at: string; // ISO8601
}

/**
 * Clarification session summary
 */
export interface ClarificationSession {
  session_id: string;
  started_at: string; // ISO8601
  completed_at?: string; // ISO8601
  mode: 'interactive' | 'jira' | 'slack' | 'file';
  questions_asked: number;
  questions_answered: number;
  responses: ClarificationResponse[];
}
