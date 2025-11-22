/**
 * PRD Analyzer Skill
 *
 * Extracts structured requirements from Product Requirements Documents.
 * Supports multiple sources: local files, Confluence pages, or raw text.
 *
 * Success Criteria:
 * - 95%+ extraction accuracy
 * - < 2 minute execution time
 * - Provider-agnostic (works with Claude, GPT-4, Gemini)
 *
 * @module skills/prd-analyzer
 */

import { createLLMProvider } from '../providers/index.js';
import { preparePrompt } from '../utils/prompts.js';
import { writeYAMLWithSchema } from '../utils/files.js';
import { RequirementsOutputSchema } from '../schemas/requirement.js';
import type { RequirementsOutput } from '../types/requirement.js';
import { WorkflowError, ValidationError } from '../utils/errors.js';
import { join } from 'path';

/**
 * Analyzes a PRD and extracts structured requirements
 *
 * @param prdContent - The PRD content as markdown text
 * @param sessionId - Session ID for output path
 * @param options - Optional configuration
 * @returns RequirementsOutput with extracted requirements
 * @throws {WorkflowError} If analysis fails
 * @throws {ValidationError} If output doesn't match schema
 */
export async function analyzePRD(
  prdContent: string,
  sessionId: string,
  options?: {
    temperature?: number;
    onFallback?: (event: any) => void;
    saveOutput?: boolean;
  }
): Promise<RequirementsOutput> {
  // Validate inputs
  if (!prdContent || prdContent.trim().length === 0) {
    throw new WorkflowError(
      'PRD content cannot be empty',
      'prd-analysis'
    );
  }

  if (!sessionId || sessionId.trim().length === 0) {
    throw new WorkflowError(
      'Session ID cannot be empty',
      'prd-analysis'
    );
  }

  console.log('📄 Analyzing PRD...');
  console.log(`   Session: ${sessionId}`);
  console.log(`   Content length: ${prdContent.length} characters`);

  const startTime = Date.now();

  try {
    // 1. Create LLM provider with fallback chain
    console.log('🤖 Initializing AI provider...');
    const llm = await createLLMProvider(options?.onFallback);
    const providerInfo = llm.getInfo();
    console.log(`   Using: ${providerInfo.name} (${providerInfo.model})`);

    // 2. Load and interpolate prompt template
    console.log('📝 Loading prompt template...');
    const prompt = await preparePrompt('prd-analyzer', {
      prd_content: prdContent,
      session_id: sessionId,
      current_date: new Date().toISOString(),
    });

    // 3. Call LLM to extract requirements
    console.log('🔍 Extracting requirements...');
    const result = await llm.generateStructured<RequirementsOutput>(
      prompt,
      RequirementsOutputSchema,
      {
        temperature: options?.temperature ?? 0, // Deterministic for analysis
        maxTokens: 8000,
      }
    );

    // 4. Validate output
    console.log('✓ Validating output...');
    const validated = RequirementsOutputSchema.parse(result);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Extracted ${validated.requirements.length} requirements (${duration}s)`);

    // 5. Save output (optional, default true)
    if (options?.saveOutput !== false) {
      const outputPath = join(
        '.prism',
        'sessions',
        sessionId,
        '01-prd-analysis',
        'requirements.yaml'
      );

      console.log(`💾 Saving to ${outputPath}...`);
      await writeYAMLWithSchema(outputPath, validated, RequirementsOutputSchema);
    }

    // Performance check (should be < 2 minutes)
    if (duration > 120) {
      console.warn(`⚠️  Analysis took ${duration}s (target: < 120s)`);
    }

    return validated;
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`❌ PRD analysis failed after ${duration}s`);

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new WorkflowError(
      `PRD analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      'prd-analysis'
    );
  }
}

/**
 * Analyzes a PRD from a file path
 *
 * @param filePath - Path to PRD file (markdown)
 * @param sessionId - Session ID for output path
 * @returns RequirementsOutput with extracted requirements
 */
export async function analyzePRDFromFile(
  filePath: string,
  sessionId: string
): Promise<RequirementsOutput> {
  const { readFile } = await import('fs/promises');

  console.log(`📂 Reading PRD from ${filePath}...`);
  const content = await readFile(filePath, 'utf-8');

  return analyzePRD(content, sessionId);
}

/**
 * Analyzes a PRD from Confluence
 *
 * @param pageIdOrUrl - Confluence page ID or URL
 * @param sessionId - Session ID for output path
 * @returns RequirementsOutput with extracted requirements
 */
export async function analyzePRDFromConfluence(
  pageIdOrUrl: string,
  sessionId: string
): Promise<RequirementsOutput> {
  const { ConfluenceMCPClient } = await import('../utils/mcp/confluence.js');

  console.log(`☁️  Fetching PRD from Confluence: ${pageIdOrUrl}...`);

  // Create Confluence client
  const client = new ConfluenceMCPClient({
    name: 'confluence',
    endpoint: process.env['CONFLUENCE_URL'],
    credentials: {
      apiToken: process.env['CONFLUENCE_API_TOKEN'] || '',
      username: process.env['CONFLUENCE_USERNAME'] || '',
    },
  });

  // Extract page ID from URL if needed
  const pageId = extractPageId(pageIdOrUrl);

  // Fetch content in markdown format
  const content = await client.getPageContent(pageId, 'markdown');

  console.log(`✓ Fetched ${content.length} characters from Confluence`);

  return analyzePRD(content, sessionId);
}

/**
 * Extracts Confluence page ID from URL or returns ID as-is
 */
function extractPageId(pageIdOrUrl: string): string {
  // If it's a URL, extract the page ID
  if (pageIdOrUrl.startsWith('http')) {
    const match = pageIdOrUrl.match(/pages\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    throw new WorkflowError(
      `Could not extract page ID from URL: ${pageIdOrUrl}`,
      'prd-analysis'
    );
  }

  // Already a page ID
  return pageIdOrUrl;
}
