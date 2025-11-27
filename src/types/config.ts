/**
 * Configuration Management Types
 *
 * Defines user configuration profile structure for MT-PRISM
 */

import { z } from 'zod';

export interface ConfigurationProfile {
  /** Config schema version */
  version: string;

  /** LLM provider configuration */
  llm: {
    provider: string;
    model?: string;
    temperature?: number;
  };

  /** MCP server configurations */
  mcps?: {
    confluence?: object;
    figma?: object;
    jira?: object;
    slack?: object;
  };

  /** Workflow settings */
  workflow?: {
    clarificationMode?: string;
    maxClarificationIterations?: number;
  };

  /** Output settings */
  output?: {
    baseDirectory?: string;
    format?: string;
    includeDiagrams?: boolean;
  };

  /** Data retention settings */
  retention: {
    sessionDays: number;
  };
}

/** Zod schema for configuration validation */
export const ConfigurationProfileSchema = z.object({
  version: z.string(),
  llm: z.object({
    provider: z.enum(['anthropic', 'openai', 'google']),
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
  }),
  mcps: z.object({
    confluence: z.object({}).optional(),
    figma: z.object({}).optional(),
    jira: z.object({}).optional(),
    slack: z.object({}).optional(),
  }).optional(),
  workflow: z.object({
    clarificationMode: z.enum(['interactive', 'jira', 'slack']).optional(),
    maxClarificationIterations: z.number().min(1).max(10).optional(),
  }).optional(),
  output: z.object({
    baseDirectory: z.string().optional(),
    format: z.enum(['markdown', 'json', 'yaml']).optional(),
    includeDiagrams: z.boolean().optional(),
  }).optional(),
  retention: z.object({
    sessionDays: z.number().min(1).max(365),
  }),
});
