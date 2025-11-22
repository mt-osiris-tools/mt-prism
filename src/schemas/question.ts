import { z } from 'zod';
import { GapSeveritySchema, StakeholderTypeSchema } from './gap.js';

export const ClarificationQuestionSchema = z
  .object({
    id: z.string().regex(/^Q-\d{3}$/, 'ID must match pattern Q-{NUMBER}'),
    priority: GapSeveritySchema,
    stakeholder_type: StakeholderTypeSchema,
    question: z
      .string()
      .min(1)
      .refine((q) => q.endsWith('?'), 'Question must end with ?'),
    context: z.string(),
    suggestions: z.array(z.string()),
    response: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    gap_id: z.string(),
  })
  .refine(
    (data) => !data.response || data.confidence !== undefined,
    'Confidence required when response is present'
  );

export const QuestionsOutputSchema = z.object({
  metadata: z.object({
    generated_at: z.string().datetime(),
    total_questions: z.number().int().min(0),
    critical_count: z.number().int().min(0),
    high_count: z.number().int().min(0),
    medium_count: z.number().int().min(0),
    low_count: z.number().int().min(0),
  }),
  questions: z.array(ClarificationQuestionSchema),
});

export const ClarificationResponseSchema = z.object({
  question_id: z.string(),
  response: z.string().min(1),
  confidence: z.number().min(0).max(1),
  answered_by: z.string().optional(),
  answered_at: z.string().datetime(),
});

export const ClarificationSessionSchema = z.object({
  session_id: z.string(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  mode: z.enum(['interactive', 'jira', 'slack', 'file']),
  questions_asked: z.number().int().min(0),
  questions_answered: z.number().int().min(0),
  responses: z.array(ClarificationResponseSchema),
});

export type ClarificationQuestionSchemaType = z.infer<
  typeof ClarificationQuestionSchema
>;
export type QuestionsOutputSchemaType = z.infer<typeof QuestionsOutputSchema>;
