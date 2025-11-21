/**
 * Figma Analyzer Skill
 *
 * Extracts UI components, design tokens, and hierarchy from Figma design files.
 * Supports variants, responsive designs, and interaction mapping.
 *
 * @module skills/figma-analyzer
 */

import { join } from 'path';
import { createLLMProvider } from '../providers/index.js';
import { preparePrompt } from '../utils/prompts.js';
import { writeYAMLWithSchema } from '../utils/files.js';
import { WorkflowError } from '../utils/errors.js';
import type { ComponentsOutput } from '../types/component.js';
import { ComponentsOutputSchema } from '../schemas/component.js';

/**
 * Options for Figma analysis
 */
export interface AnalyzeFigmaOptions {
  temperature?: number;
  onFallback?: (event: unknown) => void;
  saveOutput?: boolean;
}

/**
 * Analyzes Figma design files and extracts structured components
 *
 * @param figmaData - Figma design file JSON data
 * @param sessionId - Session identifier for output organization
 * @param options - Analysis options
 * @returns Structured components output
 * @throws {WorkflowError} If analysis fails
 */
export async function analyzeFigmaDesign(
  figmaData: string,
  sessionId: string,
  options?: AnalyzeFigmaOptions
): Promise<ComponentsOutput> {
  const startTime = Date.now();

  try {
    // 1. Validate inputs
    if (!figmaData || figmaData.trim().length === 0) {
      throw new WorkflowError('Figma data cannot be empty', 'figma-analysis');
    }

    // Validate JSON format
    let parsedFigma: unknown;
    try {
      parsedFigma = JSON.parse(figmaData);
    } catch (error) {
      throw new WorkflowError(
        'Invalid Figma data: must be valid JSON',
        'figma-analysis'
      );
    }

    if (!sessionId || sessionId.trim().length === 0) {
      throw new WorkflowError('Session ID cannot be empty', 'figma-analysis');
    }

    console.log('📐 Analyzing Figma design...');
    console.log(`   Session: ${sessionId}`);
    console.log(`   Data size: ${figmaData.length} characters`);

    // 2. Create LLM provider with fallback support
    console.log('🤖 Initializing AI provider...');
    const llm = await createLLMProvider(options?.onFallback);
    const providerInfo = llm.getInfo();
    console.log(`   Using: ${providerInfo.name} (${providerInfo.model})`);

    // 3. Load prompt template
    console.log('📝 Loading prompt template...');
    const prompt = await preparePrompt('figma-analyzer', {
      figma_data: figmaData,
      session_id: sessionId,
      current_date: new Date().toISOString(),
    });

    // 4. Generate structured output
    console.log('🔍 Extracting components and design tokens...');
    const result = await llm.generateStructured<ComponentsOutput>(
      prompt,
      ComponentsOutputSchema,
      {
        temperature: options?.temperature ?? 0,
      }
    );

    // 5. Validate output
    console.log('✓ Validating output...');
    const validated = ComponentsOutputSchema.parse(result);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Extracted ${validated.components.length} components (${duration}s)`);

    // 6. Save output if requested
    if (options?.saveOutput !== false) {
      const outputDir = join(
        process.cwd(),
        '.prism',
        'sessions',
        sessionId,
        '02-figma-analysis'
      );
      const outputPath = join(outputDir, 'components.yaml');

      console.log(`💾 Saving to ${outputPath}...`);
      await writeYAMLWithSchema(outputPath, validated, ComponentsOutputSchema);
    }

    return validated;
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`❌ Figma analysis failed after ${duration}s`);

    if (error instanceof WorkflowError) {
      throw error;
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      throw new WorkflowError(
        `Figma analysis failed: ${JSON.stringify((error as { issues: unknown }).issues, null, 2)}`,
        'figma-analysis'
      );
    }

    throw new WorkflowError(
      `Figma analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      'figma-analysis'
    );
  }
}

/**
 * Analyzes Figma design from file path
 *
 * @param filePath - Path to Figma JSON file
 * @param sessionId - Session identifier
 * @param options - Analysis options
 * @returns Structured components output
 */
export async function analyzeFigmaFile(
  filePath: string,
  sessionId: string,
  options?: AnalyzeFigmaOptions
): Promise<ComponentsOutput> {
  const { readFile } = await import('fs/promises');
  const figmaData = await readFile(filePath, 'utf-8');
  return analyzeFigmaDesign(figmaData, sessionId, options);
}
