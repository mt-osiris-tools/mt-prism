# Quick Start Guide: MT-PRISM Plugin Development

**Time to Complete**: 60 minutes  
**Audience**: Developers implementing the MT-PRISM Claude Code plugin  
**Prerequisites**: Node.js 20+, pnpm, TypeScript knowledge

## Overview

This guide walks you through setting up your development environment and implementing your first skill (PRD Analyzer) in 1 hour.

## Phase 0: Environment Setup (10 minutes)

### 1. Clone and Install Dependencies

```bash
cd /home/james/Documents/Projects/ai/mt-prism

# Install dependencies
pnpm install

# Add required packages
pnpm add @anthropic-ai/sdk yaml zod
pnpm add -D vitest @types/node tsx

# Create directory structure
mkdir -p src/{skills,workflow,mcp,lib,types,cli}
mkdir -p tests/{contract,integration,unit}
mkdir -p fixtures
mkdir -p .prism/sessions
```

### 2. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['tests/**', '**/*.test.ts', 'dist/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

### 4. Set Up Environment Variables

Create `.env`:

```bash
ANTHROPIC_API_KEY=your_key_here
CONFLUENCE_URL=https://company.atlassian.net
CONFLUENCE_TOKEN=your_token_here
```

Add to `.gitignore`:

```
.env
.prism/sessions/*
node_modules/
dist/
coverage/
```

## Phase 1: Core Utilities (15 minutes)

### 1. Create Type Definitions

Create `src/types/requirements.ts`:

```typescript
import { z } from 'zod';

export const IssueSchema = z.object({
  type: z.enum(['ambiguity', 'missing', 'conflict', 'incomplete']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
  suggestion: z.string()
});

export const RequirementSchema = z.object({
  id: z.string().regex(/^REQ-(FUNC|NF|CONST|ASSUMP)-\d{3}$/),
  type: z.enum(['functional', 'non-functional', 'constraint', 'assumption']),
  category: z.enum(['feature', 'enhancement', 'bug-fix', 'technical-debt', 'performance', 'security', 'compliance']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  complexity: z.number().min(1).max(10),
  title: z.string().min(1).max(100),
  description: z.string(),
  acceptance_criteria: z.array(z.string()),
  user_stories: z.array(z.string()),
  dependencies: z.array(z.string()),
  source_location: z.string(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['draft', 'validated', 'clarified', 'approved']),
  issues: z.array(IssueSchema)
});

export const RequirementsOutputSchema = z.object({
  metadata: z.object({
    prd_source: z.string(),
    analyzed_at: z.string(),
    analyzer_version: z.string(),
    total_requirements: z.number()
  }),
  requirements: z.array(RequirementSchema)
});

export type Issue = z.infer<typeof IssueSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type RequirementsOutput = z.infer<typeof RequirementsOutputSchema>;
```

### 2. Create Claude Client

Create `src/lib/claude-client.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
  }

  async analyze(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4.5-20250929',
      max_tokens: options.maxTokens || 8000,
      temperature: options.temperature ?? 0,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text;
  }
}
```

### 3. Create Prompt Loader

Create `src/lib/prompt-loader.ts`:

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';

export class PromptLoader {
  private cache = new Map<string, string>();
  private promptsDir: string;

  constructor(promptsDir?: string) {
    this.promptsDir = promptsDir || join(__dirname, '../../prompts');
  }

  async load(
    skillName: string,
    variables: Record<string, string> = {}
  ): Promise<string> {
    // Load from cache or file
    let template = this.cache.get(skillName);
    if (!template) {
      const path = join(this.promptsDir, `${skillName}.md`);
      template = await readFile(path, 'utf-8');
      this.cache.set(skillName, template);
    }

    // Substitute variables
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return prompt;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

### 4. Create YAML Utilities

Create `src/lib/yaml-parser.ts`:

```typescript
import YAML from 'yaml';
import { readFile, writeFile } from 'fs/promises';
import { z } from 'zod';

export async function loadYAML<T>(
  path: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  const content = await readFile(path, 'utf-8');
  const data = YAML.parse(content);
  return schema.parse(data);
}

export async function saveYAML<T>(
  path: string,
  data: T,
  comment?: string
): Promise<void> {
  const doc = new YAML.Document(data);
  
  if (comment) {
    doc.commentBefore = ` ${comment}`;
  }
  
  await writeFile(path, doc.toString(), 'utf-8');
}
```

## Phase 2: Implement PRD Analyzer (20 minutes)

### 1. Create PRD Analyzer Skill

Create `src/skills/prd-analyzer.ts`:

```typescript
import { ClaudeClient } from '../lib/claude-client';
import { PromptLoader } from '../lib/prompt-loader';
import { saveYAML } from '../lib/yaml-parser';
import { RequirementsOutput, RequirementsOutputSchema } from '../types/requirements';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import YAML from 'yaml';

export interface PRDAnalyzerOptions {
  prdContent: string;
  prdSource: string;
  outputDir: string;
}

export async function analyzePRD(
  options: PRDAnalyzerOptions
): Promise<RequirementsOutput> {
  // Initialize clients
  const claude = new ClaudeClient();
  const promptLoader = new PromptLoader();

  // Load prompt template
  const prompt = await promptLoader.load('prd-analyzer', {
    PRD_CONTENT: options.prdContent,
    PRD_SOURCE: options.prdSource
  });

  // Call Claude
  console.log('🔍 Analyzing PRD...');
  const startTime = Date.now();
  
  const response = await claude.analyze(prompt, {
    temperature: 0,
    maxTokens: 8000
  });

  // Parse response (extract YAML block)
  const yamlMatch = response.match(/```ya?ml\n([\s\S]+?)\n```/);
  if (!yamlMatch) {
    throw new Error('No YAML block found in Claude response');
  }

  const yamlContent = yamlMatch[1];
  const data = YAML.parse(yamlContent);

  // Validate with schema
  const requirements = RequirementsOutputSchema.parse(data);

  // Save outputs
  await mkdir(options.outputDir, { recursive: true });
  
  await saveYAML(
    join(options.outputDir, 'requirements.yaml'),
    requirements,
    'Generated by MT-PRISM PRD Analyzer'
  );

  // Generate dependency graph (simplified for quickstart)
  const graphMermaid = generateDependencyGraph(requirements.requirements);
  await writeFile(
    join(options.outputDir, 'requirements-graph.mmd'),
    graphMermaid,
    'utf-8'
  );

  // Generate report
  const report = generateReport(requirements);
  await writeFile(
    join(options.outputDir, 'prd-analysis-report.md'),
    report,
    'utf-8'
  );

  const duration = Date.now() - startTime;
  console.log(`✅ PRD analysis complete in ${(duration / 1000).toFixed(1)}s`);
  console.log(`   Found ${requirements.requirements.length} requirements`);

  return requirements;
}

function generateDependencyGraph(requirements: any[]): string {
  // Simplified graph generation
  let graph = 'graph TB\n';
  
  requirements.forEach(req => {
    graph += `  ${req.id}["${req.title}"]\n`;
    
    req.dependencies.forEach((dep: string) => {
      graph += `  ${dep} --> ${req.id}\n`;
    });
  });

  return graph;
}

function generateReport(output: RequirementsOutput): string {
  const { metadata, requirements } = output;
  
  return `# PRD Analysis Report

**Source**: ${metadata.prd_source}  
**Analyzed**: ${metadata.analyzed_at}  
**Version**: ${metadata.analyzer_version}

## Summary

- **Total Requirements**: ${metadata.total_requirements}
- **Functional**: ${requirements.filter(r => r.type === 'functional').length}
- **Non-Functional**: ${requirements.filter(r => r.type === 'non-functional').length}
- **With Issues**: ${requirements.filter(r => r.issues.length > 0).length}

## Requirements by Priority

${['critical', 'high', 'medium', 'low'].map(p => {
  const reqs = requirements.filter(r => r.priority === p);
  return `### ${p.charAt(0).toUpperCase() + p.slice(1)} (${reqs.length})

${reqs.map(r => `- **${r.id}**: ${r.title}`).join('\n')}`;
}).join('\n\n')}

## Issues Found

${requirements
  .filter(r => r.issues.length > 0)
  .map(r => `### ${r.id}: ${r.title}

${r.issues.map(i => `- **${i.type}** (${i.severity}): ${i.description}
  - Suggestion: ${i.suggestion}`).join('\n')}`)
  .join('\n\n')}
`;
}
```

### 2. Write Tests

Create `tests/unit/prd-analyzer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { RequirementSchema } from '../../src/types/requirements';

describe('PRD Analyzer', () => {
  it('should validate requirement schema', () => {
    const validRequirement = {
      id: 'REQ-FUNC-001',
      type: 'functional',
      category: 'feature',
      priority: 'high',
      complexity: 5,
      title: 'User login',
      description: 'Users can log in',
      acceptance_criteria: ['Login form exists'],
      user_stories: [],
      dependencies: [],
      source_location: 'Section 1',
      confidence: 0.95,
      status: 'draft',
      issues: []
    };

    const result = RequirementSchema.safeParse(validRequirement);
    expect(result.success).toBe(true);
  });

  it('should reject invalid requirement ID', () => {
    const invalid = {
      id: 'INVALID-001',
      // ... other fields
    };

    const result = RequirementSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

## Phase 3: Test Your Implementation (15 minutes)

### 1. Create Test Fixture

Create `fixtures/sample-prd.md`:

```markdown
# Feature: User Authentication

## Overview
Users need to authenticate to access the system.

## Requirements

### Authentication
Users must be able to log in using email and password. The system should support "remember me" functionality.

Acceptance Criteria:
- Login form with email and password fields
- Remember me checkbox
- Successful login redirects to dashboard
- Failed login shows error message

### Security
Passwords must be hashed using bcrypt with at least 10 rounds.
```

### 2. Create CLI Test Script

Create `src/cli/test-prd.ts`:

```typescript
import { analyzePRD } from '../skills/prd-analyzer';
import { readFile } from 'fs/promises';

async function main() {
  const prdPath = process.argv[2] || 'fixtures/sample-prd.md';
  const outputDir = '.prism/test-output';

  const content = await readFile(prdPath, 'utf-8');

  const result = await analyzePRD({
    prdContent: content,
    prdSource: prdPath,
    outputDir
  });

  console.log('\n📊 Results:');
  console.log(`   Requirements: ${result.requirements.length}`);
  console.log(`   Critical: ${result.requirements.filter(r => r.priority === 'critical').length}`);
  console.log(`   Issues: ${result.requirements.reduce((sum, r) => sum + r.issues.length, 0)}`);
  console.log(`\n📁 Output: ${outputDir}/`);
}

main().catch(console.error);
```

### 3. Run Tests

```bash
# Run unit tests
pnpm vitest run

# Run CLI test
pnpm tsx src/cli/test-prd.ts fixtures/sample-prd.md

# Check output
cat .prism/test-output/requirements.yaml
cat .prism/test-output/prd-analysis-report.md
```

## Next Steps

Congratulations! You've implemented the PRD Analyzer skill. Now:

1. **Review**: Check outputs in `.prism/test-output/`
2. **Iterate**: Adjust prompt in `prompts/prd-analyzer.md` if needed
3. **Expand**: Implement remaining skills following same pattern:
   - Figma Analyzer (Week 2)
   - Validator (Week 3)
   - Clarifier (Week 3)
   - TDD Generator (Week 4)

## Common Issues & Solutions

### Issue: "ANTHROPIC_API_KEY not set"
**Solution**: Create `.env` file with your API key

### Issue: "No YAML block found"
**Solution**: Check prompt template includes output format specification

### Issue: Zod validation fails
**Solution**: Review Claude output structure, adjust prompt or schema

### Issue: Import errors
**Solution**: Run `pnpm install` and check `tsconfig.json`

## Development Workflow

```bash
# Watch mode for tests
pnpm vitest watch

# Build TypeScript
pnpm tsc

# Run with ts-node
pnpm tsx src/cli/test-prd.ts

# Check coverage
pnpm vitest run --coverage
```

## Project Structure Reference

```
mt-prism/
├── src/
│   ├── skills/          # Your implementation goes here
│   ├── lib/             # Shared utilities (done)
│   ├── types/           # TypeScript types (done)
│   └── cli/             # Command-line interface
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── contract/        # Schema validation tests
├── prompts/             # Already exists
├── templates/           # Already exists
├── fixtures/            # Test data
└── specs/               # This planning document

```

## Resources

- **Spec**: `specs/001-prism-plugin/spec.md`
- **Plan**: `specs/001-prism-plugin/plan.md`
- **Research**: `specs/001-prism-plugin/research.md`
- **Data Model**: `specs/001-prism-plugin/data-model.md`
- **Contracts**: `specs/001-prism-plugin/contracts/`
- **Prompts**: `prompts/prd-analyzer.md`

## Getting Help

1. Review existing prompts in `prompts/` directory
2. Check schema contracts in `specs/001-prism-plugin/contracts/`
3. Review constitution: `.specify/memory/constitution.md`
4. Review architecture: `app_adn.md`

---

**Time Check**: If you've completed this guide in ~60 minutes, you're ready to continue implementation following the 5-week roadmap in `app_adn.md`.
