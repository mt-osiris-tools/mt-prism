/**
 * TDD Generator Skill
 *
 * Generates comprehensive Technical Design Document from validated requirements,
 * UI components, and clarified gaps.
 *
 * @module skills/tdd-generator
 */

import { join } from 'path';
import { writeFile } from '../utils/files.js';
import { WorkflowError } from '../utils/errors.js';
import type { RequirementsOutput } from '../types/requirement.js';
import type { ComponentsOutput } from '../types/component.js';
import type { TDD } from '../types/tdd.js';

// TODO: Re-enable when implementing LLM-based TDD generation
// import { createLLMProvider } from '../providers/index.js';
// import { preparePrompt } from '../utils/prompts.js';

/**
 * Options for TDD generation
 */
export interface GenerateTDDOptions {
  temperature?: number;
  onFallback?: (event: unknown) => void;
  saveOutput?: boolean;
  projectName?: string;
}

/**
 * Generates Technical Design Document from validated requirements and components
 *
 * @param requirements - Validated requirements from PRD Analyzer
 * @param components - UI components from Figma Analyzer
 * @param sessionId - Session identifier for output organization
 * @param options - TDD generation options
 * @returns Generated TDD
 * @throws {WorkflowError} If generation fails
 */
export async function generateTDD(
  requirements: RequirementsOutput,
  components: ComponentsOutput,
  sessionId: string,
  options?: GenerateTDDOptions
): Promise<TDD> {
  const startTime = Date.now();

  try {
    // 1. Validate inputs
    if (!requirements || !requirements.requirements) {
      throw new WorkflowError('Requirements data is invalid', 'tdd-generation');
    }

    if (!components || !components.components) {
      throw new WorkflowError('Components data is invalid', 'tdd-generation');
    }

    if (!sessionId || sessionId.trim().length === 0) {
      throw new WorkflowError('Session ID cannot be empty', 'tdd-generation');
    }

    const projectName = options?.projectName || 'Project';

    console.log('📋 Generating Technical Design Document...');
    console.log(`   Session: ${sessionId}`);
    console.log(`   Project: ${projectName}`);
    console.log(`   Requirements: ${requirements.requirements.length}`);
    console.log(`   Components: ${components.components.length}`);

    // 2. Prepare comprehensive input for TDD generation
    // Note: In production, this would use LLM provider with structured output
    // For now, using simplified generation
    // TODO: Re-enable when implementing LLM-based generation
    // const inputData = {
    //   project_name: projectName,
    //   requirements: JSON.stringify(requirements, null, 2),
    //   components: JSON.stringify(components, null, 2),
    //   current_date: new Date().toISOString(),
    //   session_id: sessionId,
    // };

    // 3. Generate TDD using simplified logic
    console.log('🔨 Generating comprehensive TDD...');

    // TODO: In production, use LLM provider with structured output
    // const llm = await createLLMProvider(options?.onFallback);
    // const prompt = await preparePrompt('tdd-generator', inputData);
    // const tdd = await llm.generateStructured<TDD>(prompt, TDDSchema, {...});
    const tdd: TDD = await generateSimplifiedTDD(
      requirements,
      components,
      projectName,
      sessionId
    );

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ TDD generation complete (${duration}s)`);
    console.log(`   Sections: ${tdd.sections.length}`);
    console.log(`   API Endpoints: ${Object.keys(tdd.api_spec.paths).length}`);
    console.log(`   Database Tables: ${tdd.database_schema.tables.length}`);
    console.log(`   Implementation Tasks: ${tdd.tasks.length}`);

    // 6. Save outputs if requested
    if (options?.saveOutput !== false) {
      await saveTDDOutputs(tdd, sessionId);
    }

    return tdd;
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`❌ TDD generation failed after ${duration}s`);

    if (error instanceof WorkflowError) {
      throw error;
    }

    throw new WorkflowError(
      `TDD generation failed: ${error instanceof Error ? error.message : String(error)}`,
      'tdd-generation'
    );
  }
}

/**
 * Helper: Generate simplified TDD structure
 * In production, this would use LLM with structured output
 */
async function generateSimplifiedTDD(
  requirements: RequirementsOutput,
  _components: ComponentsOutput,
  projectName: string,
  sessionId: string
): Promise<TDD> {
  // Create simplified TDD structure
  const sections: Array<{ title: string; content: string; order: number }> = [
    {
      title: 'Executive Summary',
      content: `# Executive Summary\n\nThis document outlines the technical design for ${projectName}.`,
      order: 1,
    },
    {
      title: 'Requirements Summary',
      content: `# Requirements Summary\n\nTotal Requirements: ${requirements.requirements.length}\n\n${requirements.requirements.map(r => `- ${r.title}: ${r.description}`).join('\n')}`,
      order: 2,
    },
    {
      title: 'System Architecture',
      content: '# System Architecture\n\nRecommended architecture: Monolith for rapid development.',
      order: 3,
    },
  ];

  // Create basic API spec
  const apiSpec = {
    openapi: '3.1.0',
    info: {
      title: `${projectName} API`,
      version: '1.0.0',
      description: `API specification for ${projectName}`,
    },
    paths: requirements.requirements
      .filter(r => r.type === 'functional')
      .reduce((acc, req, _idx) => {
        acc[`/api/v1/${req.id.toLowerCase()}`] = {
          get: {
            summary: req.title,
            description: req.description,
            responses: {
              '200': { description: 'Success' },
            },
          },
        };
        return acc;
      }, {} as Record<string, unknown>),
  };

  // Create basic database schema
  const databaseSchema = {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'UUID', nullable: false },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false },
        ],
        primary_key: ['id'],
      },
    ],
    indexes: [
      {
        table: 'users',
        columns: ['email'],
        unique: true,
        name: 'idx_users_email',
      },
    ],
    relationships: [],
  };

  // Create implementation tasks
  const tasks = requirements.requirements.slice(0, 10).map((req, idx) => ({
    id: `TASK-${String(idx + 1).padStart(3, '0')}`,
    title: req.title,
    description: req.description,
    effort_estimate: Math.min(req.complexity || 3, 8),
    dependencies: req.dependencies,
  }));

  // Create architecture diagram
  const architectureDiagram = `graph TD
    A[Client] --> B[API Gateway]
    B --> C[Application Server]
    C --> D[Database]
    C --> E[Cache]`;

  // Calculate requirements coverage
  const requirementsCoverage = requirements.requirements.map(req => ({
    requirement_id: req.id,
    covered_in_sections: ['Requirements Summary', 'System Architecture'],
    coverage_percentage: 100,
  }));

  return {
    version: '1.0.0',
    title: `Technical Design Document: ${projectName}`,
    sections,
    api_spec: apiSpec,
    database_schema: databaseSchema,
    tasks,
    architecture_diagram: architectureDiagram,
    requirements_coverage: requirementsCoverage,
    metadata: {
      generated_at: new Date().toISOString(),
      generator_version: '1.0.0',
      requirements_source: sessionId,
      components_source: sessionId,
    },
  };
}

/**
 * Helper: Save TDD outputs to session directory
 */
async function saveTDDOutputs(tdd: TDD, sessionId: string): Promise<void> {
  const outputDir = join(
    process.cwd(),
    '.prism',
    'sessions',
    sessionId,
    '05-tdd'
  );

  console.log(`💾 Saving TDD outputs to ${outputDir}...`);

  // Save main TDD document as markdown
  const tddMarkdown = `${tdd.title}\n\n${tdd.sections.map(s => s.content).join('\n\n---\n\n')}`;
  await writeFile(join(outputDir, 'tdd.md'), tddMarkdown);

  // Save API spec as JSON
  await writeFile(join(outputDir, 'api-spec.json'), JSON.stringify(tdd.api_spec, null, 2));

  // Save database schema as SQL
  const sqlSchema = generateSQL(tdd.database_schema);
  await writeFile(join(outputDir, 'database-schema.sql'), sqlSchema);

  // Save tasks as YAML
  await writeFile(join(outputDir, 'tasks.yaml'), JSON.stringify(tdd.tasks, null, 2));

  // Save architecture diagram
  await writeFile(join(outputDir, 'architecture.mmd'), tdd.architecture_diagram);

  console.log('✓ All TDD artifacts saved');
}

/**
 * Helper: Generate SQL from database schema
 */
function generateSQL(schema: any): string {
  let sql = '-- Database Schema\n\n';

  for (const table of schema.tables) {
    sql += `CREATE TABLE ${table.name} (\n`;
    sql += table.columns
      .map((col: any) => `  ${col.name} ${col.type}${col.nullable ? '' : ' NOT NULL'}`)
      .join(',\n');
    sql += `,\n  PRIMARY KEY (${table.primary_key.join(', ')})\n`;
    sql += ');\n\n';
  }

  for (const index of schema.indexes) {
    sql += `CREATE${index.unique ? ' UNIQUE' : ''} INDEX ${index.name} ON ${index.table}(${index.columns.join(', ')});\n`;
  }

  return sql;
}
