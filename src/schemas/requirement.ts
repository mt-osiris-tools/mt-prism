import { z } from 'zod';

/**
 * Zod schemas for Requirement entity
 *
 * Runtime validation for requirements output from PRD Analyzer
 * Per FR-059: Validate all outputs against schemas before completion
 */

export const RequirementIssueTypeSchema = z.enum([
  'ambiguity',
  'missing',
  'conflict',
  'incomplete',
]);

export const RequirementIssueSeveritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
]);

export const RequirementIssueSchema = z.object({
  type: RequirementIssueTypeSchema,
  severity: RequirementIssueSeveritySchema,
  description: z.string().min(1),
  suggestion: z.string().optional(),
});

export const RequirementTypeSchema = z.enum([
  'functional',
  'non-functional',
  'constraint',
  'assumption',
]);

export const RequirementPrioritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
]);

export const RequirementStatusSchema = z.enum([
  'draft',
  'validated',
  'clarified',
  'approved',
]);

export const RequirementSchema = z
  .object({
    id: z
      .string()
      .regex(
        /^REQ-(FUNC|PERF|SEC|CONS)-\d{3}$/,
        'ID must match pattern REQ-{TYPE}-{NUMBER}'
      ),
    type: RequirementTypeSchema,
    category: z.string().optional(),
    priority: RequirementPrioritySchema,
    complexity: z
      .number()
      .int()
      .min(1, 'Complexity must be at least 1')
      .max(10, 'Complexity must not exceed 10'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    acceptance_criteria: z.array(z.string()),
    user_stories: z.array(z.string()).optional(),
    dependencies: z.array(z.string()),
    source_location: z.string().optional(),
    confidence: z
      .number()
      .min(0, 'Confidence must be between 0 and 1')
      .max(1, 'Confidence must be between 0 and 1'),
    status: RequirementStatusSchema,
    issues: z.array(RequirementIssueSchema),
  })
  .strict();

export const RequirementsOutputSchema = z.object({
  metadata: z.object({
    prd_source: z.string().min(1),
    analyzed_at: z.string().datetime(),
    analyzer_version: z.string().optional(),
    total_requirements: z.number().int().min(0),
  }),
  requirements: z.array(RequirementSchema),
});

// Type inference for TypeScript
export type RequirementSchemaType = z.infer<typeof RequirementSchema>;
export type RequirementsOutputSchemaType = z.infer<
  typeof RequirementsOutputSchema
>;
