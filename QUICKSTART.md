# MT-PRISM Quick Start Guide

**Get your PRD-to-TDD automation running in 1 hour**

This guide will walk you through implementing the MT-PRISM Claude Code plugin from scratch, starting with a simple PRD analyzer and building up to the full workflow.

---

## Prerequisites

- Node.js 20+ installed
- Claude API key (from Anthropic Console)
- Basic TypeScript knowledge
- (Optional) Confluence and Figma access for testing

---

## Part 1: Project Setup (10 minutes)

### Step 1: Initialize Project

```bash
# Create project directory
mkdir mt-prism-plugin
cd mt-prism-plugin

# Initialize npm project
npm init -y

# Install dependencies
npm install @anthropic-ai/sdk yaml zod
npm install -D typescript @types/node tsx vitest

# Initialize TypeScript
npx tsc --init
```

### Step 2: Configure TypeScript

Edit `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Set Up Environment

Create `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

Create `.env.example`:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

### Step 4: Project Structure

```bash
mkdir -p src/{skills,types,utils} prompts templates
```

Final structure:
```
mt-prism-plugin/
├── src/
│   ├── skills/          # Skill implementations
│   ├── types/           # TypeScript types
│   └── utils/           # Shared utilities
├── prompts/             # Claude prompts (copy from docs)
├── templates/           # Output templates (copy from docs)
├── tests/               # Test files
├── examples/            # Example inputs
└── package.json
```

---

## Part 2: Core Utilities (15 minutes)

### Create Claude Client

`src/utils/claude.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export async function callClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const {
    temperature = 0,
    maxTokens = 8000,
    model = 'claude-sonnet-4-5-20250929',
  } = options;

  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  return textContent.text;
}
```

### Create Prompt Loader

`src/utils/prompts.ts`:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

export function loadPrompt(skillName: string): string {
  const promptPath = join(process.cwd(), 'prompts', `${skillName}.md`);
  return readFileSync(promptPath, 'utf-8');
}

export function fillPromptTemplate(
  template: string,
  replacements: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
```

### Create File Utilities

`src/utils/files.ts`:

```typescript
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import yaml from 'yaml';

export function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

export function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf-8');
}

export function readYAML<T>(path: string): T {
  const content = readFile(path);
  return yaml.parse(content) as T;
}

export function writeYAML(path: string, data: unknown): void {
  const content = yaml.stringify(data);
  writeFile(path, content);
}
```

---

## Part 3: Implement PRD Analyzer (20 minutes)

### Define Types

`src/types/requirement.ts`:

```typescript
export interface Requirement {
  id: string;
  type: 'functional' | 'non-functional' | 'constraint' | 'assumption';
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  complexity: number;
  title: string;
  description: string;
  acceptance_criteria: string[];
  user_stories: string[];
  dependencies: string[];
  source_location: string;
  confidence: number;
  status: string;
  issues: RequirementIssue[];
}

export interface RequirementIssue {
  type: 'ambiguity' | 'missing' | 'conflict' | 'incomplete';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

export interface RequirementsOutput {
  metadata: {
    prd_source: string;
    analyzed_at: string;
    analyzer_version: string;
    total_requirements: number;
  };
  requirements: Requirement[];
}
```

### Implement Skill

`src/skills/prd-analyzer.ts`:

```typescript
import yaml from 'yaml';
import { callClaude } from '../utils/claude';
import { loadPrompt, fillPromptTemplate } from '../utils/prompts';
import { writeFile } from '../utils/files';
import { RequirementsOutput } from '../types/requirement';

export interface PRDAnalyzerOptions {
  prdContent: string;
  prdSource: string;
  outputDir: string;
}

export async function analyzePRD(
  options: PRDAnalyzerOptions
): Promise<RequirementsOutput> {
  console.log('📄 Analyzing PRD...');

  // Load prompt template
  const promptTemplate = loadPrompt('prd-analyzer');

  // Fill in PRD content
  const prompt = fillPromptTemplate(promptTemplate, {
    PRD_CONTENT: options.prdContent,
  });

  console.log('🤖 Calling Claude API...');

  // Call Claude
  const response = await callClaude(prompt, {
    temperature: 0,
    maxTokens: 8000,
  });

  console.log('📝 Parsing response...');

  // Extract YAML from response (Claude often wraps it in ```yaml)
  const yamlMatch = response.match(/```yaml\n([\s\S]*?)\n```/);
  const yamlContent = yamlMatch ? yamlMatch[1] : response;

  // Parse YAML
  const result: RequirementsOutput = yaml.parse(yamlContent);

  // Validate and add metadata
  result.metadata = {
    ...result.metadata,
    prd_source: options.prdSource,
    analyzed_at: new Date().toISOString(),
    analyzer_version: '1.0',
    total_requirements: result.requirements.length,
  };

  console.log(`✅ Extracted ${result.requirements.length} requirements`);

  // Save output
  const outputPath = `${options.outputDir}/requirements.yaml`;
  writeFile(outputPath, yaml.stringify(result));
  console.log(`💾 Saved to ${outputPath}`);

  return result;
}
```

### Create CLI Command

`src/cli.ts`:

```typescript
#!/usr/bin/env node
import { analyzePRD } from './skills/prd-analyzer';
import { readFile } from './utils/files';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npm start <prd-file>');
    process.exit(1);
  }

  const prdFile = args[0];
  const prdContent = readFile(prdFile);

  const result = await analyzePRD({
    prdContent,
    prdSource: prdFile,
    outputDir: './output',
  });

  console.log('\n📊 Summary:');
  console.log(`  Total Requirements: ${result.requirements.length}`);
  console.log(`  Critical: ${result.requirements.filter(r => r.priority === 'critical').length}`);
  console.log(`  High: ${result.requirements.filter(r => r.priority === 'high').length}`);
  console.log(`  With Issues: ${result.requirements.filter(r => r.issues.length > 0).length}`);
}

main().catch(console.error);
```

Update `package.json`:

```json
{
  "scripts": {
    "start": "tsx src/cli.ts",
    "build": "tsc",
    "test": "vitest"
  }
}
```

---

## Part 4: Test It! (5 minutes)

### Create Test PRD

`examples/sample-prd.md`:

```markdown
# User Management System PRD

## Overview
Build a user management system with authentication and profile management.

## Functional Requirements

### Authentication
- Users must be able to sign in using email and password
- System shall remember login for 30 days if "Remember Me" is checked
- Failed login attempts should display clear error message

### User Profile
- Users should be able to edit their profile information
- Profile must include: first name, last name, email, avatar
- Avatar upload should support JPG and PNG formats

### User List
- Admins can view list of all users
- List should be searchable by name or email
- List should be pageable (20 users per page)

## Non-Functional Requirements

### Performance
- Pages should load quickly
- API responses should be fast

### Security
- Passwords must be hashed using bcrypt
- All API endpoints require authentication except login
```

### Run Analysis

```bash
# Copy prompts (from mt-prism repo)
cp -r /path/to/mt-prism/prompts/* ./prompts/

# Run analyzer
npm start examples/sample-prd.md
```

Expected output:
```
📄 Analyzing PRD...
🤖 Calling Claude API...
📝 Parsing response...
✅ Extracted 5 requirements
💾 Saved to ./output/requirements.yaml

📊 Summary:
  Total Requirements: 5
  Critical: 1
  High: 2
  With Issues: 2
```

Check `output/requirements.yaml`:

```yaml
metadata:
  prd_source: examples/sample-prd.md
  analyzed_at: 2025-11-05T...
  total_requirements: 5

requirements:
  - id: REQ-FUNC-001
    type: functional
    title: "User Authentication with Email/Password"
    priority: critical
    # ... more fields
```

---

## Part 5: Add More Skills (Variable)

Now that you have the pattern, add more skills:

### Figma Analyzer

`src/skills/figma-analyzer.ts`:

```typescript
import { callClaude } from '../utils/claude';
import { loadPrompt, fillPromptTemplate } from '../utils/prompts';
import { ComponentsOutput } from '../types/component';

export async function analyzeFigma(
  figmaData: string,
  outputDir: string
): Promise<ComponentsOutput> {
  const promptTemplate = loadPrompt('figma-analyzer');
  const prompt = fillPromptTemplate(promptTemplate, {
    FIGMA_DATA: figmaData,
  });

  const response = await callClaude(prompt);
  // ... parse and return
}
```

### Validator

`src/skills/validator.ts`:

```typescript
import { RequirementsOutput } from '../types/requirement';
import { ComponentsOutput } from '../types/component';
import { ValidationResult } from '../types/validation';

export async function validateRequirements(
  requirements: RequirementsOutput,
  components: ComponentsOutput,
  outputDir: string
): Promise<ValidationResult> {
  // Implementation similar to PRD analyzer
}
```

---

## Part 6: Testing (10 minutes)

### Create Test Suite

`tests/prd-analyzer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { analyzePRD } from '../src/skills/prd-analyzer';

describe('PRD Analyzer', () => {
  it('should extract requirements from simple PRD', async () => {
    const prdContent = `
# Test PRD
## Requirements
- Users must be able to login
- System should validate email format
    `;

    const result = await analyzePRD({
      prdContent,
      prdSource: 'test',
      outputDir: './test-output',
    });

    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.requirements[0]).toHaveProperty('id');
    expect(result.requirements[0]).toHaveProperty('title');
  });

  it('should detect ambiguities', async () => {
    const prdContent = `
# Test PRD
## Requirements
- Application should be fast
    `;

    const result = await analyzePRD({
      prdContent,
      prdSource: 'test',
      outputDir: './test-output',
    });

    const hasAmbiguityIssue = result.requirements.some((req) =>
      req.issues.some((issue) => issue.type === 'ambiguity')
    );

    expect(hasAmbiguityIssue).toBe(true);
  });
});
```

### Run Tests

```bash
npm test
```

---

## Part 7: Full Workflow (Optional)

Once all skills are implemented, create the orchestrator:

`src/workflow/discover.ts`:

```typescript
import { analyzePRD } from '../skills/prd-analyzer';
import { analyzeFigma } from '../skills/figma-analyzer';
import { validateRequirements } from '../skills/validator';
import { clarify } from '../skills/clarification-manager';
import { generateTDD } from '../skills/tdd-generator';

export interface DiscoverOptions {
  prdUrl: string;
  figmaUrl: string;
  outputDir: string;
}

export async function discover(options: DiscoverOptions) {
  console.log('🚀 Starting discovery workflow...\n');

  // Step 1: Analyze PRD
  console.log('[1/5] Analyzing PRD...');
  const requirements = await analyzePRD({
    prdContent: await fetchPRD(options.prdUrl),
    prdSource: options.prdUrl,
    outputDir: `${options.outputDir}/01-prd-analysis`,
  });

  // Step 2: Analyze Figma
  console.log('[2/5] Analyzing Figma...');
  const components = await analyzeFigma(
    await fetchFigma(options.figmaUrl),
    `${options.outputDir}/02-figma-analysis`
  );

  // Step 3: Validate
  console.log('[3/5] Validating...');
  const validation = await validateRequirements(
    requirements,
    components,
    `${options.outputDir}/03-validation`
  );

  // Step 4: Clarify (if needed)
  if (validation.status === 'NEEDS_CLARIFICATION') {
    console.log('[4/5] Clarifying...');
    await clarify(
      validation.questions,
      `${options.outputDir}/04-clarification`
    );
  }

  // Step 5: Generate TDD
  console.log('[5/5] Generating TDD...');
  const tdd = await generateTDD(
    requirements,
    components,
    `${options.outputDir}/05-tdd`
  );

  console.log('\n🎉 Discovery complete!');
  return tdd;
}
```

---

## Best Practices

### 1. Error Handling

```typescript
export async function analyzePRD(
  options: PRDAnalyzerOptions
): Promise<RequirementsOutput> {
  try {
    // ... implementation
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Claude API Error:', error.message);
      if (error.status === 429) {
        console.error('Rate limit exceeded. Wait before retrying.');
      }
    }
    throw error;
  }
}
```

### 2. Progress Reporting

```typescript
export async function analyzePRD(
  options: PRDAnalyzerOptions,
  onProgress?: (message: string) => void
): Promise<RequirementsOutput> {
  onProgress?.('Loading prompt template...');
  const promptTemplate = loadPrompt('prd-analyzer');

  onProgress?.('Calling Claude API...');
  const response = await callClaude(prompt);

  onProgress?.('Parsing response...');
  const result = yaml.parse(response);

  return result;
}
```

### 3. Caching

```typescript
import { createHash } from 'crypto';

function getCacheKey(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

const cache = new Map<string, RequirementsOutput>();

export async function analyzePRD(
  options: PRDAnalyzerOptions
): Promise<RequirementsOutput> {
  const cacheKey = getCacheKey(options.prdContent);

  if (cache.has(cacheKey)) {
    console.log('✨ Using cached result');
    return cache.get(cacheKey)!;
  }

  const result = await _analyzePRD(options);
  cache.set(cacheKey, result);
  return result;
}
```

### 4. Validation

```typescript
import { z } from 'zod';

const RequirementSchema = z.object({
  id: z.string().regex(/^REQ-(FUNC|PERF|SEC)-\d{3}$/),
  type: z.enum(['functional', 'non-functional', 'constraint', 'assumption']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  complexity: z.number().min(1).max(10),
  // ... more fields
});

export function validateRequirementOutput(
  data: unknown
): RequirementsOutput {
  // Throws if invalid
  return RequirementsOutputSchema.parse(data);
}
```

---

## Troubleshooting

### Claude returns invalid YAML

**Problem**: Response isn't valid YAML

**Solution**: Add parsing logic to handle markdown code blocks:

```typescript
function extractYAML(response: string): string {
  // Try to extract from code block first
  const yamlMatch = response.match(/```ya?ml\n([\s\S]*?)\n```/);
  if (yamlMatch) {
    return yamlMatch[1];
  }
  // Return as-is
  return response;
}
```

### Rate limiting

**Problem**: 429 errors from Claude API

**Solution**: Add retry with exponential backoff:

```typescript
async function callClaudeWithRetry(
  prompt: string,
  maxRetries = 3
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callClaude(prompt);
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### Low quality output

**Problem**: Claude's output doesn't match expectations

**Solution**:
1. Review prompt for clarity
2. Add more examples to prompt
3. Adjust temperature (lower = more deterministic)
4. Try different model (opus for quality, haiku for speed)

---

## Next Steps

### Immediate
1. ✅ Implement PRD Analyzer (done above)
2. ⏳ Add Figma Analyzer
3. ⏳ Add Validator
4. ⏳ Add Clarification Manager
5. ⏳ Add TDD Generator

### Short Term
- Add comprehensive test suite
- Implement caching
- Add progress reporting
- Create CLI with better UX

### Long Term
- Package as npm module
- Publish to npm
- Create VS Code extension
- Add web dashboard

---

## Resources

- **Documentation**: See `docs/` for detailed specs
- **Prompts**: See `prompts/` for Claude prompts
- **Templates**: See `templates/` for output schemas
- **Examples**: See `examples/` for sample inputs

## Support

- Issues: File on GitHub
- Questions: Check documentation first
- Contributions: PRs welcome!

---

**Happy building!** 🚀

If you get stuck, refer to the detailed specifications in `docs/specs/` or check the prompt templates in `prompts/`.
