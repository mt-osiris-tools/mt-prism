import { z } from 'zod';

export const GapTypeSchema = z.enum([
  'missing_ui',
  'no_requirement',
  'incomplete_mapping',
  'inconsistency',
  'missing_acceptance_criteria',
]);

export const GapSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const StakeholderTypeSchema = z.enum(['product', 'design', 'engineering']);

export const GapSchema = z
  .object({
    id: z.string().regex(/^GAP-\d{3}$/, 'ID must match pattern GAP-{NUMBER}'),
    type: GapTypeSchema,
    severity: GapSeveritySchema,
    requirement_id: z.string().optional(),
    component_id: z.string().optional(),
    description: z.string().min(1),
    stakeholder: z.array(StakeholderTypeSchema),
    question_id: z.string().optional(),
  })
  .refine(
    (data) => data.requirement_id || data.component_id,
    'Either requirement_id or component_id must be present'
  );

export const GapsOutputSchema = z.object({
  metadata: z.object({
    validated_at: z.string().datetime(),
    validator_version: z.string().optional(),
    total_gaps: z.number().int().min(0),
    critical_count: z.number().int().min(0),
    high_count: z.number().int().min(0),
    medium_count: z.number().int().min(0),
    low_count: z.number().int().min(0),
  }),
  gaps: z.array(GapSchema),
});

export type GapSchemaType = z.infer<typeof GapSchema>;
export type GapsOutputSchemaType = z.infer<typeof GapsOutputSchema>;
