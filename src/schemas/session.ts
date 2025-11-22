import { z } from 'zod';

/**
 * Zod schemas for Session entity
 *
 * Runtime validation for session state (checkpoints, resume capability)
 * Per FR-050: 5 checkpoint boundaries
 */

export const WorkflowStepSchema = z.enum([
  'prd-analysis',
  'figma-analysis',
  'validation',
  'clarification',
  'tdd-generation',
]);

export const SessionStatusSchema = z.enum([
  'in-progress',
  'paused',
  'completed',
  'failed',
]);

export const CheckpointSchema = z.object({
  step: WorkflowStepSchema,
  timestamp: z.string().datetime(),
  outputs: z.array(z.string()),
  metadata: z.object({
    duration_ms: z.number().int().min(0),
    provider_used: z.string().optional(),
    estimated_cost: z.number().min(0).optional(),
  }),
});

export const SessionOutputsSchema = z.object({
  requirements_yaml: z.string().optional(),
  components_yaml: z.string().optional(),
  validation_report: z.string().optional(),
  gaps_yaml: z.string().optional(),
  questions_md: z.string().optional(),
  clarification_summary: z.string().optional(),
  tdd_md: z.string().optional(),
  api_spec_yaml: z.string().optional(),
  database_schema_sql: z.string().optional(),
});

export const SessionSchema = z.object({
  session_id: z
    .string()
    .regex(/^sess-\d{13}$/, 'Session ID must match pattern sess-{timestamp}'),
  current_step: WorkflowStepSchema,
  status: SessionStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  prd_source: z.string().min(1),
  figma_source: z.string().optional(),
  outputs: SessionOutputsSchema,
  checkpoints: z
    .array(CheckpointSchema)
    .max(5, 'Maximum 5 checkpoints per FR-050'),
  config: z.object({
    ai_provider: z.string(),
    workflow_timeout_minutes: z.number().int().min(1),
    max_clarification_iterations: z.number().int().min(1),
  }),
});

export const SessionStateSchema = z.object({
  session: SessionSchema,
  version: z.string(),
  last_checkpoint: CheckpointSchema.optional(),
});

export type SessionSchemaType = z.infer<typeof SessionSchema>;
export type SessionStateSchemaType = z.infer<typeof SessionStateSchema>;
