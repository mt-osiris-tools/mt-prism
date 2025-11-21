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
```

### Testing
```bash
npm test               # Run all tests with Vitest
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report (80%+ required)
```

### Code Quality
```bash
npm run lint           # ESLint on src/ and tests/
npm run format         # Format code with Prettier
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

**CRITICAL**: Never call AI provider SDKs directly. Always use the unified abstraction layer at `src/utils/llm.ts`:

```typescript
// ❌ WRONG - Direct SDK usage
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic(...)

// ✅ CORRECT - Use abstraction
import { createLLMProvider } from '../utils/llm'
const llm = await createLLMProvider()
const result = await llm.generateText(prompt)
```

The abstraction supports three providers (Anthropic Claude, OpenAI GPT-4, Google Gemini) with automatic provider selection based on `AI_PROVIDER` environment variable.

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
├── skills/           # Skill implementations (core logic)
├── providers/        # LLM provider adapters (Anthropic/OpenAI/Google)
├── types/           # TypeScript type definitions and Zod schemas
├── utils/           # Shared utilities (LLM abstraction, file ops, validation)
└── workflows/       # Skill orchestration

prompts/             # Claude-optimized prompts for each skill
templates/           # Output schemas and TDD template
tests/
├── unit/            # Unit tests (90%+ coverage for skills)
├── integration/     # Integration tests with MCPs
└── providers/       # Provider-agnostic tests (run with all LLMs)
```

## Key Technical Constraints

### TypeScript Strict Mode
`tsconfig.json` enables all strict checks. Pay attention to:
- `noUncheckedIndexedAccess` - array/object access may be undefined
- `noUnusedLocals` and `noUnusedParameters` - remove unused code
- `noImplicitReturns` - all code paths must return

### Test Coverage Requirements
- **80%+ overall** (enforced by Vitest)
- **90%+ for skills** (per constitution)
- Must test with all three LLM providers to ensure provider-agnostic behavior

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

### Error Handling Pattern
```typescript
try {
  await skillLogic()
} catch (error) {
  // 1. Save state before failing
  await saveState()

  // 2. Provide actionable error message
  if (error.code === 'MCP_CONNECTION_FAILED') {
    throw new Error(
      'Confluence connection failed. Check CONFLUENCE_URL and token in .env'
    )
  }

  // 3. Offer recovery options
  console.log('Recovery: Use local file with --source ./local-prd.md')
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

- **AI_AGENT.md** - Comprehensive AI assistant guidance (detailed architecture)
- **.specify/memory/constitution.md** - Architectural principles and governance
- **docs/specs/README.md** - All skill specifications
- **docs/integration/LLM_PROVIDER_GUIDE.md** - Multi-provider configuration
- **docs/integration/AGENT_INTEGRATION_GUIDE.md** - Platform-specific setup
- **docs/strategy/LOCAL_FIRST_STRATEGY.md** - Zero-infrastructure principles
- **.env.example** - Environment configuration template

### SpecKit Slash Commands
The project uses SpecKit workflow for feature development:
- `/speckit.specify` - Create/update feature specifications
- `/speckit.plan` - Execute implementation planning
- `/speckit.tasks` - Generate dependency-ordered tasks
- `/speckit.implement` - Execute implementation plan
- `/speckit.clarify` - Identify underspecified areas
- `/speckit.analyze` - Cross-artifact consistency checks

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

## What NOT to Do

- ❌ Create servers, databases, Docker containers, or cloud services
- ❌ Call AI provider SDKs directly (Anthropic/OpenAI/Google)
- ❌ Implement API clients for Confluence/Figma (use MCPs)
- ❌ Store data externally (everything in `.prism/` directory)
- ❌ Commit directly to main branch (use feature branches)
- ❌ Skip tests or accept <80% coverage
- ❌ Use generic error messages (always actionable)
- ❌ Assume single provider (must work with all three)

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
