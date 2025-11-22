/**
 * MT-PRISM Plugin - Main Entry Point
 *
 * Local-first AI plugin for automated PRD-to-TDD discovery workflows
 */

// Core Skills
export { analyzePRD } from './skills/prd-analyzer.js';
export { analyzeFigmaDesign, analyzeFigmaFile } from './skills/figma-analyzer.js';
export { validateRequirements } from './skills/requirements-validator.js';
export { generateClarifications, collectResponses } from './skills/clarification-manager.js';
export { generateTDD } from './skills/tdd-generator.js';

// Workflow
export { executeDiscoveryWorkflow } from './workflows/discovery.js';
export type {
  DiscoveryWorkflowOptions,
  DiscoveryWorkflowResult,
} from './workflows/discovery.js';

// Types
export type {
  Requirement,
  RequirementsOutput,
  RequirementType,
  RequirementPriority,
  RequirementIssue,
} from './types/requirement.js';

export type { ComponentsOutput, ComponentSchemaType } from './types/component.js';

export type { Gap, GapsOutput, GapType, GapSeverity } from './types/gap.js';

export type {
  ClarificationQuestion,
  QuestionsOutput,
  ClarificationResponse,
  ClarificationSession,
} from './types/question.js';

export type { TDD, APISpecification, DatabaseSchema, ImplementationTask } from './types/tdd.js';

export type { Session, SessionState, WorkflowStep, SessionStatus } from './types/session.js';

// Utilities
export { WorkflowError } from './utils/errors.js';
export { createLLMProvider } from './providers/index.js';
