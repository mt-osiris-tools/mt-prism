import { z } from 'zod';

export const ComponentCategorySchema = z.enum([
  'atom',
  'molecule',
  'organism',
  'template',
]);

export const ComponentVariantSchema = z.object({
  name: z.string(),
  properties: z.record(z.unknown()),
});

export const ComponentPropertySchema = z.object({
  name: z.string(),
  type: z.string(),
  default_value: z.unknown().optional(),
  description: z.string().optional(),
});

export const DesignTokensSchema = z.object({
  colors: z.record(z.string()).optional(),
  typography: z.record(z.unknown()).optional(),
  spacing: z.record(z.number()).optional(),
  shadows: z.record(z.string()).optional(),
  border_radius: z.record(z.number()).optional(),
});

export const ComponentUsageSchema = z.object({
  screens: z.array(z.string()),
  instances: z.number().int().min(0),
});

export const ComponentSchema = z.object({
  id: z.string().regex(/^COMP-\d{3}$/, 'ID must match pattern COMP-{NUMBER}'),
  name: z.string().min(1),
  type: z.string().min(1),
  category: ComponentCategorySchema,
  variants: z.array(ComponentVariantSchema),
  properties: z.array(ComponentPropertySchema),
  design_tokens: DesignTokensSchema,
  usage: ComponentUsageSchema,
  screenshot: z.string().optional(),
});

export const ComponentsOutputSchema = z.object({
  metadata: z.object({
    figma_file_id: z.string(),
    figma_file_name: z.string().optional(),
    analyzed_at: z.string().datetime(),
    analyzer_version: z.string().optional(),
    total_components: z.number().int().min(0),
  }),
  components: z.array(ComponentSchema),
  design_tokens: DesignTokensSchema,
});

export type ComponentSchemaType = z.infer<typeof ComponentSchema>;
export type ComponentsOutputSchemaType = z.infer<typeof ComponentsOutputSchema>;
