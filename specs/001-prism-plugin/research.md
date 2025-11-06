# Technology Research: MT-PRISM Claude Code Plugin

**Feature**: 001-prism-plugin  
**Date**: 2025-11-06  
**Status**: Phase 0 Complete

## Technology Stack Decisions

### 1. Core Language: TypeScript 5.3+

**Decision**: Use TypeScript 5.3+ for all implementation

**Rationale**:
- **Type Safety**: Zod schema validation combined with TypeScript interfaces provides end-to-end type safety from Claude API responses to file outputs
- **Claude Code Native**: Claude Code has excellent TypeScript support with built-in execution
- **Ecosystem**: Rich npm ecosystem for YAML parsing, schema validation, and API clients
- **Developer Experience**: Superior IntelliSense, refactoring, and error detection
- **Team Expertise**: Existing team familiarity from mt-osiris project

**Alternatives Considered**:
- **Python**: Better for data processing, but weaker type system and less natural fit for Claude Code plugins
- **JavaScript**: Simpler but loses critical type safety for complex data structures
- **Rust**: Maximum performance but excessive complexity for this use case

**Trade-offs Accepted**:
- Compilation step required (acceptable: tsc is fast)
- Slightly larger runtime footprint vs. JavaScript (negligible for this scale)

---

### 2. AI Provider: Anthropic Claude API (@anthropic-ai/sdk ^0.27.0)

**Decision**: Use Anthropic Claude Sonnet 4.5 via official SDK

**Rationale**:
- **Quality**: Best-in-class for structured analysis and generation tasks
- **Context Window**: 200K tokens enables processing large PRDs and Figma files
- **Structured Output**: Excellent at following YAML/JSON schema specifications
- **Cost Efficiency**: ~$3-5 per workflow (vs. $15-20 with GPT-4)
- **Official SDK**: Type-safe, well-maintained, with streaming support

**Configuration**:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Analysis tasks (deterministic)
const analysisConfig = {
  model: 'claude-sonnet-4.5-20250929',
  max_tokens: 8000,
  temperature: 0
};

// Generation tasks (creative)
const generationConfig = {
  model: 'claude-sonnet-4.5-20250929',
  max_tokens: 16000,
  temperature: 0.3
};
```

**Alternatives Considered**:
- **OpenAI GPT-4**: More expensive, smaller context window, less consistent structured output
- **Open Source Models**: Insufficient quality for complex analysis tasks
- **Claude Opus**: Overkill for this use case, 3x cost increase

**Trade-offs Accepted**:
- API dependency (vs. local models) - acceptable given quality requirements
- Per-token cost (mitigated by optimized prompts and caching)

---

### 3. Schema Validation: Zod ^3.22.4

**Decision**: Use Zod for runtime schema validation

**Rationale**:
- **Type Inference**: Automatically generates TypeScript types from schemas
- **Composability**: Easy to build complex schemas from primitives
- **Error Messages**: Clear, actionable validation errors
- **Integration**: Works seamlessly with TypeScript and yaml library
- **Performance**: Compiled schemas are fast enough for our scale

**Example Usage**:
```typescript
import { z } from 'zod';

const RequirementSchema = z.object({
  id: z.string().regex(/^REQ-(FUNC|NF|CONST)-\d{3}$/),
  type: z.enum(['functional', 'non-functional', 'constraint']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  complexity: z.number().min(1).max(10),
  title: z.string().min(1).max(100),
  description: z.string(),
  acceptance_criteria: z.array(z.string()),
  dependencies: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  status: z.enum(['draft', 'validated', 'clarified', 'approved']),
  issues: z.array(z.object({
    type: z.enum(['ambiguity', 'missing', 'conflict', 'incomplete']),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    suggestion: z.string()
  }))
});

export type Requirement = z.infer<typeof RequirementSchema>;
```

**Alternatives Considered**:
- **JSON Schema**: More verbose, requires separate type definitions
- **Joi**: Less TypeScript integration, older ecosystem
- **AJV**: Fast but complex API, less composable
- **TypeBox**: Similar to Zod but smaller community

**Trade-offs Accepted**:
- Runtime validation overhead (minimal: <10ms per validation)
- Learning curve for team (mitigated by excellent documentation)

---

### 4. YAML Processing: yaml ^2.3.4

**Decision**: Use yaml library for parsing and stringifying

**Rationale**:
- **Standard Compliance**: Full YAML 1.2 support
- **Type Preservation**: Maintains JavaScript types through serialization
- **Comment Preservation**: Important for human-readable outputs
- **Error Handling**: Clear parse error messages with line numbers
- **No Dependencies**: Pure JavaScript implementation

**Example Usage**:
```typescript
import YAML from 'yaml';
import { readFile, writeFile } from 'fs/promises';

// Parse YAML with validation
async function loadRequirements(path: string): Promise<Requirement[]> {
  const content = await readFile(path, 'utf-8');
  const data = YAML.parse(content);
  
  // Validate with Zod
  const schema = z.object({
    metadata: MetadataSchema,
    requirements: z.array(RequirementSchema)
  });
  
  return schema.parse(data).requirements;
}

// Generate YAML with comments
async function saveRequirements(
  path: string, 
  requirements: Requirement[]
): Promise<void> {
  const doc = new YAML.Document({
    metadata: {
      prd_source: '...',
      analyzed_at: new Date().toISOString(),
      total_requirements: requirements.length
    },
    requirements
  });
  
  // Add helpful comment
  doc.commentBefore = ' Generated by MT-PRISM PRD Analyzer';
  
  await writeFile(path, doc.toString(), 'utf-8');
}
```

**Alternatives Considered**:
- **js-yaml**: Popular but less type-safe, deprecated
- **JSON**: Simpler but not human-friendly for complex structures
- **TOML**: Limited nesting support, not suitable for our data

**Trade-offs Accepted**:
- Slower than JSON (acceptable: <50ms for typical files)
- YAML complexity (mitigated by using subset of features)

---

### 5. Testing Framework: Vitest 1.0+

**Decision**: Use Vitest for all testing (unit, integration, E2E)

**Rationale**:
- **Speed**: 10-20x faster than Jest due to Vite's architecture
- **TypeScript Native**: No babel/ts-jest required, uses esbuild
- **Jest Compatible**: Familiar API for team, easy migration
- **Watch Mode**: Instant feedback during development
- **Coverage**: Built-in c8 coverage with v8 profiling

**Configuration**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['tests/**', '**/*.test.ts', 'dist/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    setupFiles: ['./tests/setup.ts']
  }
});
```

**Test Organization**:
- **Unit Tests**: Test individual functions and skill logic (80%+ coverage)
- **Contract Tests**: Validate output schemas against Zod definitions
- **Integration Tests**: Test MCP interactions with mocks
- **E2E Tests**: Full workflow tests with fixture data

**Alternatives Considered**:
- **Jest**: Slower, requires ts-jest transform
- **Mocha/Chai**: More setup, less integrated ecosystem
- **AVA**: Interesting concurrency model but smaller community

**Trade-offs Accepted**:
- Newer ecosystem (mitigated by Jest compatibility)
- Fewer third-party integrations (not needed for our use case)

---

### 6. MCP Integration Strategy

**Decision**: Implement standard MCP clients using JSON-RPC protocol

**Required MCPs**:

#### Confluence MCP (Atlassian)
- **Status**: ✅ Available in mt-osiris
- **Version**: 1.0.0+
- **Methods**: getPage, getPageContent, createPage, updatePage, addComment
- **Auth**: API token via environment variable

#### Figma MCP
- **Status**: 🔨 To be implemented (Week 2)
- **Methods**: getFile, getFileComponents, getFileStyles, exportImage
- **Auth**: Personal access token
- **Implementation Note**: Build on standard MCP template from mt-osiris

#### Jira MCP
- **Status**: 🔨 Optional (Week 3)
- **Methods**: createIssue, updateIssue, getIssue, addComment
- **Auth**: API token
- **Fallback**: File export mode if unavailable

#### Slack MCP
- **Status**: 🔨 Optional (Week 3)
- **Methods**: sendMessage, sendInteractiveMessage, getThreadReplies
- **Auth**: Bot token
- **Fallback**: File export mode if unavailable

**MCP Client Pattern**:
```typescript
// Base MCP client
class MCPClient {
  constructor(
    private serverName: string,
    private transport: Transport
  ) {}
  
  async call<T>(method: string, params: unknown): Promise<T> {
    const request = {
      jsonrpc: '2.0',
      method: `${this.serverName}/${method}`,
      params,
      id: crypto.randomUUID()
    };
    
    const response = await this.transport.send(request);
    
    if (response.error) {
      throw new MCPError(
        response.error.code,
        response.error.message
      );
    }
    
    return response.result as T;
  }
}

// Confluence client example
class ConfluenceMCPClient extends MCPClient {
  constructor() {
    super('confluence', new StdioTransport());
  }
  
  async getPage(pageId: string) {
    return this.call<ConfluencePage>('getPage', { pageId });
  }
  
  async getPageContent(pageId: string) {
    return this.call<string>('getPageContent', { pageId });
  }
}
```

---

### 7. State Management: Local Filesystem

**Decision**: Use local .prism/ directory for all state and outputs

**Directory Structure**:
```
.prism/
├── sessions/
│   └── sess-{timestamp}/
│       ├── session_state.yaml       # Current workflow state
│       ├── 01-prd-analysis/
│       │   ├── requirements.yaml
│       │   ├── requirements-graph.mmd
│       │   └── prd-analysis-report.md
│       ├── 02-figma-analysis/
│       │   ├── components.yaml
│       │   ├── design-tokens.json
│       │   └── figma-analysis-report.md
│       ├── 03-validation/
│       │   ├── validation-report.md
│       │   ├── gaps.yaml
│       │   └── requirement-component-map.yaml
│       ├── 04-clarification/        # Optional
│       │   ├── clarification-questions.md
│       │   ├── responses.yaml
│       │   └── updated-requirements.yaml
│       └── 05-tdd/
│           ├── TDD.md
│           ├── api-spec.yaml
│           ├── database-schema.sql
│           ├── tasks.json
│           └── types.ts
├── metrics.jsonl                     # Workflow metrics log
└── .prism-config.yaml               # User configuration
```

**Rationale**:
- **Zero Infrastructure**: No databases, no servers, no cloud services
- **Human Readable**: All files are text-based for easy inspection
- **Version Control Ready**: Users can commit session outputs to Git
- **Resume Capability**: Session state enables workflow resumption
- **Privacy**: All data stays local, user has full control

**Session State Schema**:
```yaml
session_id: string              # sess-{timestamp}
workflow_type: string           # "discovery"
status: string                  # running | paused | completed | failed
current_step: number            # 1-5
steps_completed: number[]       # [1, 2, 3]
created_at: string              # ISO8601
updated_at: string              # ISO8601
inputs:
  prd_url: string
  figma_url: string
  clarification_mode: string
outputs:
  requirements_path: string
  components_path: string
  tdd_path: string
error:                          # If status = failed
  step: number
  message: string
  recoverable: boolean
```

---

### 8. Prompt Engineering Strategy

**Decision**: Use file-based prompt templates with variable substitution

**Template Structure**:
```markdown
# {Skill Name}

You are a specialized AI assistant for {skill purpose}.

## Objectives
1. {Primary objective}
2. {Secondary objective}

## Input
{INPUT_VARIABLE}

## Guidelines
- {Guideline 1}
- {Guideline 2}

## Output Format
{Schema specification in YAML/JSON}

## Examples
### Example 1
Input: {example input}
Output:
{example output}

## Quality Checklist
- [ ] {Check 1}
- [ ] {Check 2}
```

**Prompt Loader Implementation**:
```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';

export class PromptLoader {
  private cache = new Map<string, string>();
  
  async load(
    skillName: string, 
    variables: Record<string, string>
  ): Promise<string> {
    // Load from cache or file
    let template = this.cache.get(skillName);
    if (!template) {
      const path = join(__dirname, '../../prompts', `${skillName}.md`);
      template = await readFile(path, 'utf-8');
      this.cache.set(skillName, template);
    }
    
    // Substitute variables
    let prompt = template;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(
        new RegExp(`\\{${key}\\}`, 'g'), 
        value
      );
    }
    
    return prompt;
  }
}
```

**Prompt Optimization Techniques**:
- **Temperature**: 0 for analysis (deterministic), 0.3 for generation (creative)
- **Max Tokens**: Tuned per skill (8K for analysis, 16K for TDD)
- **Few-Shot Examples**: 2-4 examples per prompt covering edge cases
- **Quality Checklists**: Self-verification at end of prompt
- **Structured Output**: Explicit YAML/JSON schema in prompt

---

## Development Tools

### Package Manager: pnpm
- **Rationale**: Fast, disk-efficient, strict dependency resolution
- **Already Used**: Consistent with mt-osiris monorepo

### Build Tool: tsc (TypeScript Compiler)
- **Rationale**: Simple, standard, no additional complexity needed
- **Config**: Target ES2022, strict mode, declaration files

### Code Quality
- **Linter**: ESLint with TypeScript plugin
- **Formatter**: Prettier (already configured in mt-osiris)
- **Pre-commit**: Husky + lint-staged (optional, not critical)

### Documentation
- **API Docs**: TSDoc comments + TypeDoc generation
- **User Docs**: Markdown in docs/ directory
- **Prompt Docs**: Inline comments in prompts/

---

## Performance Optimization Strategy

### Claude API Optimization
1. **Prompt Caching**: Cache common prompt sections (constitution, schemas)
2. **Batch Processing**: Group related API calls where possible
3. **Streaming**: Use streaming for long outputs (TDD generation)
4. **Token Budgeting**: Monitor token usage, optimize prompts iteratively

### File I/O Optimization
1. **Parallel Reads**: Use Promise.all for independent file reads
2. **Streaming**: Stream large files (>1MB) instead of reading fully
3. **Compression**: Gzip old sessions (optional future optimization)

### Validation Optimization
1. **Compiled Schemas**: Pre-compile Zod schemas at startup
2. **Lazy Validation**: Only validate when necessary (skip for trusted inputs)
3. **Partial Validation**: Validate incrementally during parsing

---

## Risk Mitigation

### Risk 1: Claude API Rate Limits
- **Mitigation**: Exponential backoff with jitter, max 3 retries
- **Fallback**: Clear error message, save state, allow resume

### Risk 2: MCP Connection Failures
- **Mitigation**: Timeout + retry logic, graceful degradation
- **Fallback**: Local file mode for PRDs, skip optional MCPs (Jira/Slack)

### Risk 3: Invalid Output from Claude
- **Mitigation**: Zod validation with clear errors, automatic retry with stricter prompt
- **Fallback**: Manual mode - save Claude output, ask user to fix

### Risk 4: Large File Processing
- **Mitigation**: Chunking strategy for >100-page PRDs
- **Fallback**: Warn user, suggest splitting PRD into sections

### Risk 5: Schema Evolution
- **Mitigation**: Semantic versioning for schemas, migration scripts
- **Fallback**: Version detection in files, backward compatibility for 1 major version

---

## Success Metrics

### Development Velocity
- **Week 1**: Framework ready (file I/O, Claude client, prompt loader)
- **Week 2**: 2 skills complete (PRD + Figma analyzers)
- **Week 3**: 2 skills complete (Validator + Clarifier)
- **Week 4**: Final skill + workflow complete (TDD Generator)
- **Week 5**: Testing, docs, launch

### Quality Gates
- **Unit Test Coverage**: 80%+ (enforced by CI)
- **Integration Tests**: All MCP interactions covered
- **E2E Tests**: 3+ complete workflows with fixtures
- **Performance**: All targets met (< 2/3/3/5/20 min)

### User Validation
- **Beta Testing**: 3-5 users complete workflows successfully
- **Satisfaction**: 4+/5 average rating
- **Bug Rate**: <2 critical bugs per 10 workflows

---

## Next Steps

1. **Phase 0 Complete** ✅ - This document
2. **Phase 1**: Create data-model.md, contracts/, quickstart.md
3. **Phase 2**: Run /speckit.tasks to generate implementation tasks
4. **Implementation**: Follow 5-week roadmap
5. **Testing**: Continuous testing throughout implementation
6. **Launch**: Beta → Production after Week 5

---

**Document Status**: Complete  
**Reviewed By**: Pending  
**Approved For Implementation**: Pending
