# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MT-PRISM is a **local-first AI plugin** that automates software discovery from Product Requirements Documents (PRDs) to Technical Design Documents (TDDs). It operates within AI coding assistant environments (Claude Code, Cursor, etc.) with **zero infrastructure** - no servers, databases, or containers.

**Key Architecture Principle**: Plugin-based skill system where discrete AI skills orchestrate through simple workflows, leveraging native tools and Model Context Protocol (MCP) servers for external integrations.

## Common Development Commands

### Build & Development
```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Run CLI in development mode with tsx
npm start              # Run compiled CLI from dist/
npm run dev -- --prd=./docs/prd.md  # Test with sample PRD
```

### Testing
```bash
npm test               # Run all tests with Vitest
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report (80%+ required)
npm run test:prd       # Test PRD analyzer with sample file
```

### Code Quality
```bash
npm run lint           # ESLint on src/ and tests/
npm run format         # Format code with Prettier
```

### CLI Usage
```bash
prism --prd=./path/to/prd.md --project="My Project"
prism --prd=https://confluence.com/123 --figma=abc123xyz
prism --list-sessions   # List all previous sessions
prism --resume=sess-1234567890  # Resume a paused session
```

## Architecture

### Local-First Design

All data stored in `.prism/` directory - **never create external services, APIs, or cloud infrastructure**. The system must work offline except for AI provider API calls and optional MCP interactions.

```
.prism/
├── config.yaml              # User configuration
├── sessions/
│   └── sess-{timestamp}/    # Session state and all outputs
│       ├── session_state.yaml
│       ├── 01-prd-analysis/
│       ├── 02-figma-analysis/
│       ├── 03-validation/
│       ├── 04-clarification/
│       └── 05-tdd/
└── metrics.jsonl            # Workflow metrics
```

### LLM Provider Abstraction

**CRITICAL**: Never call AI provider SDKs directly. Always use the unified abstraction layer at `src/providers/index.ts`:

```typescript
// ❌ WRONG - Direct SDK usage
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic(...)

// ✅ CORRECT - Use abstraction
import { createLLMProvider } from '../providers/index.js'
const llm = await createLLMProvider()
const result = await llm.generateText(prompt)
```

The abstraction supports three providers (Anthropic Claude, OpenAI GPT-4, Google Gemini) with automatic provider selection based on `AI_PROVIDER` environment variable.

**Provider Implementation**: Each provider implements `LLMProvider` interface in `src/providers/`:
- `anthropic.ts` - Claude API client
- `openai.ts` - OpenAI/GPT-4 client
- `google.ts` - Gemini client
- `factory.ts` - Provider selection logic
- `types.ts` - Shared interfaces

### Five Core Skills

1. **PRD Analyzer** (`prism.analyze-prd`) - Extract structured requirements from PRDs
2. **Figma Analyzer** (`prism.analyze-figma`) - Extract UI components from Figma designs
3. **Requirements Validator** (`prism.validate`) - Cross-validate requirements against designs
4. **Clarification Manager** (`prism.clarify`) - Manage Q&A loops with stakeholders
5. **TDD Generator** (`prism.generate-tdd`) - Generate comprehensive technical design documents

Each skill operates independently but can be orchestrated via the Discovery Workflow (`prism.discover`).

### MCP Integration

External service access must use Model Context Protocol servers:
- **Confluence MCP**: PRD access from Atlassian
- **Figma MCP**: Design file access
- **Jira MCP**: Optional for async clarification
- **Slack MCP**: Optional for stakeholder notifications

Skills delegate to MCPs rather than implementing API clients directly.

## Code Organization

```
src/
├── cli.ts                    # CLI entry point with graceful shutdown, session management
├── index.ts                  # Public API exports (skills, workflows, types)
├── skills/                   # Skill implementations (core logic)
│   ├── prd-analyzer.ts       # PRD extraction and structuring
│   ├── prd-analyzer/         # PRD analyzer submodules (classifier, ambiguity detector)
│   ├── figma-analyzer.ts     # Figma component extraction
│   ├── requirements-validator.ts  # Cross-validation logic
│   ├── clarification-manager.ts   # Q&A workflow management
│   ├── tdd-generator.ts      # TDD artifact generation
│   └── quality-validator.ts  # Output quality validation
├── providers/                # LLM provider adapters
│   ├── types.ts              # LLMProvider interface
│   ├── factory.ts            # Provider selection/creation
│   ├── anthropic.ts          # Claude implementation
│   ├── openai.ts             # GPT-4 implementation
│   └── google.ts             # Gemini implementation
├── schemas/                  # Zod validation schemas
│   ├── requirement.ts
│   ├── component.ts
│   ├── gap.ts
│   ├── question.ts
│   └── session.ts
├── types/                    # TypeScript type definitions (derived from schemas)
├── utils/                    # Shared utilities
│   ├── auth.ts               # Credential discovery (env vars, OAuth, .env files)
│   ├── session.ts            # Session state management, checkpoint/resume
│   ├── files.ts              # YAML/JSON file operations with schema validation
│   ├── lockfile.ts           # File locking for concurrent access
│   ├── config-manager.ts     # .prism-config.yaml management
│   ├── prompts.ts            # Prompt template loading
│   ├── errors.ts             # Custom error types (WorkflowError)
│   ├── cleanup.ts            # Session cleanup and retention
│   ├── timeout-manager.ts    # Timeout handling for long operations
│   └── mcp/                  # MCP client implementations
│       └── confluence.ts
├── services/                 # Service layer
│   └── environment.ts        # Environment detection (Claude Code vs. standalone)
└── workflows/                # Skill orchestration
    └── discovery.ts          # Full PRD-to-TDD workflow with checkpoints

prompts/             # Claude-optimized prompts for each skill
templates/           # Output schemas and TDD template
tests/
├── unit/            # Unit tests (90%+ coverage for skills)
├── integration/     # Integration tests with MCPs
├── providers/       # Provider-agnostic tests (run with all LLMs)
└── fixtures/        # Test data (sample PRDs, expected outputs)
    └── prds/        # Sample PRD files for testing
```

## Key Technical Constraints

### TypeScript Strict Mode & ES Modules

**Strict Compiler Options** (`tsconfig.json`):
- `strict: true` - All strict type checks enabled
- `noUncheckedIndexedAccess` - Array/object access may be undefined (must check before use)
- `noUnusedLocals` and `noUnusedParameters` - Remove all unused code
- `noImplicitReturns` - All code paths must explicitly return
- `noPropertyAccessFromIndexSignature` - Use bracket notation for dynamic properties
- `noImplicitOverride` - Use `override` keyword explicitly

**ES Modules Setup**:
The project uses pure ES modules (`"type": "module"` in `package.json`):
- **All imports must include `.js` extension** even for TypeScript files:
  ```typescript
  // ✅ CORRECT
  import { createLLMProvider } from '../providers/index.js'
  import type { Requirement } from '../types/requirement.js'

  // ❌ WRONG (will fail at runtime)
  import { createLLMProvider } from '../providers/index'
  ```
- TypeScript compiles `.ts` → `.js` but import paths stay as `.js`
- This is required for Node.js ES module compatibility
- VSCode/editors may show warnings but the code is correct

**CLI Entry Point**:
- `src/cli.ts` has shebang: `#!/usr/bin/env node`
- `package.json` bin field: `"prism": "dist/cli.js"`
- After `npm run build`, CLI is executable: `node dist/cli.js` or `prism`

### Test Coverage Requirements
- **80%+ overall** (enforced by Vitest via `vitest.config.ts`)
- **90%+ for skills** (per constitution)
- Must test with all three LLM providers to ensure provider-agnostic behavior

**Testing Patterns**:
```typescript
// Unit tests - mock LLM providers
import { vi } from 'vitest'
const mockProvider = {
  generateText: vi.fn().mockResolvedValue('mock response'),
  generateStructured: vi.fn().mockResolvedValue(mockData)
}

// Provider-agnostic tests - run with all providers
describe.each(['anthropic', 'openai', 'google'])('PRD Analyzer with %s', (provider) => {
  beforeAll(() => {
    process.env.AI_PROVIDER = provider
  })

  it('should extract requirements', async () => {
    const result = await analyzePRD(prdContent)
    expect(result.requirements.length).toBeGreaterThan(0)
  })
})

// Integration tests - use test fixtures
import { readFile } from 'fs/promises'
const samplePRD = await readFile('tests/fixtures/prds/simple-prd.md', 'utf-8')
```

**Test Files**:
- `tests/unit/` - Pure logic tests with mocks
- `tests/integration/` - Cross-module tests
- `tests/providers/` - Provider comparison tests
- `tests/fixtures/prds/` - Sample PRD files for testing

### Performance Targets
- PRD Analysis: < 2 minutes
- Figma Analysis: < 3 minutes
- Validation: < 3 minutes
- TDD Generation: < 5 minutes
- **Full Workflow: < 20 minutes** (end-to-end)

### Data Format Standards

All outputs must use standardized YAML/JSON schemas with Zod validation:

```typescript
// ✅ Validate all skill outputs
import { RequirementsOutputSchema } from '../types/requirement'
const validated = RequirementsOutputSchema.parse(rawOutput)
```

Key schemas:
- `requirements.yaml` - Structured requirements with metadata
- `components.yaml` - UI component inventory
- `gaps.yaml` - Validation gaps with severity
- `api-spec.yaml` - OpenAPI 3.1 specification
- `database-schema.sql` - Executable SQL DDL

## Constitution & Governance

The project follows strict architectural principles defined in `.specify/memory/constitution.md` (v3.1.0):

**Core Principles**:
1. **Skill-First Architecture** - Decompose into discrete skills with clear boundaries
2. **Document-Driven Discovery** - Always start with PRD/Figma analysis
3. **Test-First Development** - TDD is mandatory (non-negotiable)
4. **Iterative Clarification** - Resolve ambiguities through structured loops
5. **Progressive Enhancement** - Deliver in independently valuable increments
6. **Observable Operations** - Provide progress feedback and metrics
7. **MCP-Based Integration** - Use protocol for external services
8. **LLM Provider Abstraction** - Never call provider SDKs directly

**Quality Gates** - Each skill must pass criteria before next skill executes:
- Analysis Gate (95%+ parsing accuracy)
- Validation Gate (90%+ gap detection, >85% avg confidence)
- Clarification Gate (all critical questions answered)
- TDD Generation Gate (100% requirement coverage, valid OpenAPI/SQL)
- Acceptance Gate (4.5/5 quality rating on manual review)

## Development Workflow

### Git Strategy
- `main` - Production releases only (protected)
- `develop` - Integration branch
- `feature/{skill-name}` - Feature development
- Always create feature branches (never commit directly to main)

Use conventional commits:
```bash
feat: implement PRD analyzer skill
fix: handle empty Figma components
test: add provider-agnostic validation tests
docs: update LLM provider guide
```

### Implementation Order (Progressive Enhancement)
Phase 1 (Weeks 1-2): PRD Analyzer → Figma Analyzer
Phase 2 (Week 3): Validator → Clarification Manager
Phase 3 (Week 4): TDD Generator → Discovery Workflow
Phase 4 (Week 5): Testing & Launch

Each skill must be independently usable before moving to the next.

### Prompt Engineering Standards

All LLM prompts in `prompts/` directory must follow:
- **Temperature**: 0 for analysis, 0.3 for generation
- **Structure**: Role → Objectives → Guidelines → Format → Examples → Checklist
- **Examples**: 2-4 few-shot examples covering edge cases
- **Provider Agnostic**: Must work identically across Claude/GPT-4/Gemini

### Session Management & Recovery

The system supports session checkpointing for long-running workflows:

**Session Structure**:
```
.prism/sessions/sess-{timestamp}/
├── session_state.yaml    # Session metadata, checkpoints, current step
├── 01-prd-analysis/      # Step outputs
├── 02-figma-analysis/
├── 03-validation/
├── 04-clarification/
└── 05-tdd/
```

**Key Features**:
- Automatic checkpoint creation after each workflow step
- Graceful shutdown handling (SIGTERM, SIGINT) saves state
- Resume from any checkpoint: `prism --resume=sess-1234567890`
- Session listing: `prism --list-sessions`
- Lockfile mechanism prevents concurrent access to same session

**Implementation** (see `src/utils/session.ts`):
```typescript
// Create/load session
const session = await createSession({ prdSource, figmaSource })
// or
const session = await loadSession(sessionId)

// Save checkpoint
session.checkpoints.push({
  step: 'prd-analysis',
  timestamp: new Date().toISOString(),
  status: 'completed'
})
await saveSession(session)

// Resume workflow
const result = await executeDiscoveryWorkflow({
  resumeSessionId: 'sess-1234567890'
})
```

### Error Handling Pattern
```typescript
try {
  await skillLogic()
} catch (error) {
  // 1. Save state before failing
  session.status = 'failed'
  await saveSession(session)

  // 2. Provide actionable error message
  if (error.code === 'MCP_CONNECTION_FAILED') {
    throw new WorkflowError(
      'Confluence connection failed. Check CONFLUENCE_URL and token in .env',
      { cause: error, recoverable: true }
    )
  }

  // 3. Offer recovery options
  console.log('Recovery: Use local file with --prd=./local-prd.md')
  console.log(`Or resume after fixing: prism --resume=${session.session_id}`)
}
```

### Progress Reporting
All skills must provide:
```typescript
console.log('📄 Analyzing PRD from Confluence...')  // Start
console.log('🤖 Calling AI provider...')            // Progress
console.log('✅ Extracted 23 requirements (1m 45s)') // Complete
console.log('\n💾 Saved to .prism/outputs/requirements.yaml')
```

## Important Project Files

### Core Documentation
- **AI_AGENT.md** - Comprehensive AI assistant guidance (detailed architecture)
- **README.md** - Project overview, features, and quick start
- **QUICKSTART.md** - Step-by-step implementation guide (1 hour)
- **.specify/memory/constitution.md** - Architectural principles and governance (v3.1.0)
- **copilot-instructions.md** - GitHub Copilot-specific guidance (also useful for Claude)

### Configuration Files
- **.env.example** - Environment configuration template
- **tsconfig.json** - TypeScript strict mode configuration
- **vitest.config.ts** - Test configuration with 80% coverage threshold
- **package.json** - Dependencies and scripts

### Architecture Documentation
- **docs/specs/README.md** - All skill specifications
- **docs/integration/LLM_PROVIDER_GUIDE.md** - Multi-provider configuration
- **docs/integration/AGENT_INTEGRATION_GUIDE.md** - Platform-specific setup (7 AI assistants)
- **docs/integration/MULTI_PROVIDER_MIGRATION.md** - Migration guide for multi-provider support
- **docs/strategy/LOCAL_FIRST_STRATEGY.md** - Zero-infrastructure principles
- **docs/strategy/MVP_AND_GIT_STRATEGY.md** - Development roadmap and git workflow

### Skill Specifications
- **docs/specs/SKILL_PRD_ANALYZER.md** - PRD extraction specification
- **docs/specs/SKILL_FIGMA_ANALYZER.md** - Figma analysis specification
- **docs/specs/SKILL_VALIDATOR.md** - Cross-validation specification
- **docs/specs/SKILL_CLARIFICATION_MANAGER.md** - Clarification workflow specification
- **docs/specs/SKILL_TDD_GENERATOR.md** - TDD generation specification
- **docs/specs/WORKFLOW_DISCOVERY.md** - Full workflow orchestration

### Prompts and Templates
- **prompts/** - LLM prompts for each skill (Claude-optimized, provider-agnostic)
- **templates/** - Output schemas and TDD template

### SpecKit Slash Commands
The project uses SpecKit workflow for feature development:
- `/speckit.specify` - Create/update feature specifications
- `/speckit.plan` - Execute implementation planning
- `/speckit.tasks` - Generate dependency-ordered tasks
- `/speckit.implement` - Execute implementation plan
- `/speckit.clarify` - Identify underspecified areas
- `/speckit.analyze` - Cross-artifact consistency checks

### Environment Detection & Credential Discovery

The CLI automatically detects its execution environment and discovers credentials at startup (see `src/services/environment.ts` and `src/utils/auth.ts`):

**Environment Detection**:
- Detects if running inside Claude Code (checks for environment indicators)
- Identifies workspace path
- Discovers available MCP servers
- Logs confidence level and detection method

**Credential Discovery** (priority order):
1. **OAuth tokens** - Claude Code native authentication (`claude login`)
2. **Environment variables** - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`
3. **.env file** - Project-local `.env` file with API keys
4. **Not found** - Exits with actionable error messages and recovery instructions

**Provider Selection**:
- Set via `AI_PROVIDER` environment variable (default: `anthropic`)
- Supported values: `anthropic`, `openai`, `google`
- Can be overridden in `.prism-config.yaml`

## Cost & Performance Context

**Budget**: ~$58K Year 1 (development + API costs)

**Per-Workflow Costs** (100 workflows/month):
- Anthropic Claude: ~$4.00/workflow (~$4,800/year)
- OpenAI GPT-4: ~$3.50/workflow (~$4,200/year)
- Google Gemini: ~$2.50/workflow (~$3,000/year)

**Why This Approach**: 95% cost savings vs. full multi-agent system ($1.3M), 4-5 weeks vs. 20 weeks development time, zero infrastructure maintenance.

## Security & Privacy

**Credentials**: Store all API keys in `.env` (gitignored), never in code/config
**Data Privacy**: PRD/Figma content sent to AI provider APIs (documented to users)
**Local Data**: All TDD outputs, metrics, session state stay on developer machine
**Retention**: 30-day default for `.prism/` data (configurable)

## Key Architectural Patterns

### Schema-First Development

All data structures use Zod schemas as the single source of truth:

1. **Define schema** in `src/schemas/*.ts` using Zod
2. **Derive TypeScript types** using `z.infer<typeof Schema>` in `src/types/*.ts`
3. **Validate at boundaries** - always validate external data (LLM responses, file reads, user input)
4. **Use schema-aware file operations** - `writeYAMLWithSchema()` in `src/utils/files.ts`

Example flow:
```typescript
// 1. Schema definition (src/schemas/requirement.ts)
export const RequirementSchema = z.object({
  id: z.string(),
  type: z.enum(['functional', 'non-functional', 'constraint']),
  // ...
})
export const RequirementsOutputSchema = z.object({
  metadata: MetadataSchema,
  requirements: z.array(RequirementSchema)
})

// 2. Type derivation (src/types/requirement.ts)
export type Requirement = z.infer<typeof RequirementSchema>
export type RequirementsOutput = z.infer<typeof RequirementsOutputSchema>

// 3. Validation in skills (src/skills/prd-analyzer.ts)
const rawOutput = await llm.generateStructured(prompt, RequirementsOutputSchema)
// rawOutput is now type-safe and validated

// 4. Validated file writes (src/utils/files.ts)
await writeYAMLWithSchema(outputPath, rawOutput, RequirementsOutputSchema)
```

### Provider-Agnostic LLM Calls

Never call provider SDKs directly. The abstraction ensures all skills work with any provider:

```typescript
// Skills call the abstraction
import { createLLMProvider } from '../providers/index.js'

const llm = await createLLMProvider()

// For unstructured text
const text = await llm.generateText(prompt, { temperature: 0 })

// For structured data with schema validation
const data = await llm.generateStructured(prompt, RequirementsOutputSchema)

// For streaming (progress updates)
const stream = await llm.streamText(prompt)
for await (const chunk of stream) {
  process.stdout.write(chunk)
}
```

The factory (`src/providers/factory.ts`) selects the provider based on:
1. Environment variable `AI_PROVIDER`
2. Available API keys
3. Config file setting

### Prompt Template System

Prompts are external markdown files loaded at runtime:

```typescript
import { preparePrompt } from '../utils/prompts.js'

// Load prompt from prompts/prd-analyzer.md
const prompt = await preparePrompt('prd-analyzer', {
  prdContent: prdText,
  projectName: 'MyProject'
})

// Prompt is interpolated with variables and ready to send
const result = await llm.generateStructured(prompt, RequirementsOutputSchema)
```

Benefits:
- Prompts can be edited without code changes
- Version control for prompt engineering
- Provider-agnostic (works with Claude, GPT-4, Gemini)
- Easy A/B testing of prompt variations

### File Operations with Locking

All file operations use utilities from `src/utils/files.ts` with proper error handling:

```typescript
import { readYAML, writeYAMLWithSchema, ensureDirectory } from '../utils/files.js'

// Create directories safely
await ensureDirectory('.prism/sessions/sess-123/01-prd-analysis')

// Write with schema validation
await writeYAMLWithSchema(
  '.prism/sessions/sess-123/01-prd-analysis/requirements.yaml',
  requirementsData,
  RequirementsOutputSchema
)

// Read with schema validation
const requirements = await readYAML<RequirementsOutput>(
  requirementsPath,
  RequirementsOutputSchema
)
```

Session state files use lockfiles (`src/utils/lockfile.ts`) to prevent concurrent access:
```typescript
import { acquireLock, releaseLock } from '../utils/lockfile.js'

const lockPath = await acquireLock(sessionStatePath)
try {
  // Read, modify, write session state
  const session = await loadSession(sessionId)
  session.status = 'in-progress'
  await saveSession(session)
} finally {
  await releaseLock(lockPath)
}
```

## What NOT to Do

- ❌ Create servers, databases, Docker containers, or cloud services
- ❌ Call AI provider SDKs directly (Anthropic/OpenAI/Google) - use `createLLMProvider()`
- ❌ Implement API clients for Confluence/Figma (use MCPs)
- ❌ Store data externally (everything in `.prism/` directory)
- ❌ Commit directly to main branch (use feature branches)
- ❌ Skip tests or accept <80% coverage
- ❌ Use generic error messages (always actionable)
- ❌ Assume single provider (must work with all three)
- ❌ Write raw files without schema validation
- ❌ Hardcode prompts in TypeScript code (use external templates)
- ❌ Access session files without lockfile protection

## Success Criteria

When implementing features, ensure:
- ✅ 95%+ extraction accuracy (PRD/Figma analyzers)
- ✅ 90%+ gap detection rate (validator)
- ✅ < 20 min full workflow time (end-to-end)
- ✅ 4.5/5 TDD quality rating (manual review)
- ✅ 80%+ test coverage (enforced)
- ✅ Works with all three AI providers (provider-agnostic)
- ✅ Zero infrastructure dependencies
- ✅ All data stored locally in `.prism/`

## Installation System

The project includes a one-command curl installer (see `install.sh` and `specs/003-curl-install/`):

**Installation Flow**:
1. User runs: `curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash`
2. Installer detects platform (macOS, Linux, WSL)
3. Verifies Node.js 20+ is installed
4. Downloads latest release tarball from GitHub
5. Extracts to `~/.mt-prism/`
6. Creates symlink in `~/.local/bin/prism` (or `/usr/local/bin/prism`)
7. Writes `install.json` manifest for uninstaller
8. Adds to PATH if needed

**Key Files**:
- `install.sh` - Main installer script (Bash 4.0+, POSIX-compliant)
- `install.json` - Installation manifest (version, paths, platform)
- `~/.mt-prism/` - Installation directory
- `~/.local/bin/prism` - Symlink to CLI (user install)
- `/usr/local/bin/prism` - Symlink to CLI (system install)

**Installer Features**:
- Platform detection (uname, /proc/version for WSL)
- Dependency checks (Node.js version validation)
- Safe extraction with verification
- Automatic PATH configuration
- Support for version pinning: `--version 1.0.0`
- Graceful error messages with recovery instructions

**Uninstaller**:
- Reads `install.json` to find installation paths
- Removes `~/.mt-prism/` directory
- Removes symlink from PATH
- Cleans up configuration (optional)

## Active Technologies
- Node.js ≥20.0.0 (runtime requirement)
- TypeScript 5.9+ with strict mode and ES2022 modules
- Vitest (testing with 80% coverage enforcement)
- Zod (schema validation)
- ES Modules (`"type": "module"`)
- Bash 4.0+ (installer script) + curl, tar, grep, sed (POSIX utilities)
- Local filesystem (`~/.mt-prism/` for installation, `.prism/` for data storage)

## Recent Changes
- **v0.1.0**: Claude Code Session Integration (P1-P2 Complete) - Added session management, environment detection, credential discovery
- **003-curl-install**: One-command curl installer with platform detection
- **002-coding-agent-integration**: Multi-platform AI assistant support (7 platforms)
- **001-claude-code-integration**: Claude Code native integration with MCP support
