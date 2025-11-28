# AI_AGENT.md

This file provides guidance to AI coding assistants (Claude Code, Cursor, Aider, etc.) when working with the MT-PRISM codebase.

## Project Overview

**MT-PRISM** is a **local-first AI plugin** that automates the software discovery process from Product Requirements Document (PRD) to Technical Design Document (TDD).

**Supported AI Providers**: Anthropic Claude, OpenAI GPT-4, Google Gemini
**Supported Platforms**: Claude Code, Claude Code CLI, Cursor, GitHub Copilot CLI, OpenAI Codex, Codex CLI, VS Code (OpenCode)

## Architecture Principles

### Local-First Design

MT-PRISM is designed to run **entirely on the developer's machine** with **zero infrastructure**:

- **No servers** - Runs within AI coding assistant environment
- **No databases** - Uses local `.prism/` directory for storage
- **No Docker/Kubernetes** - Simple Node.js application
- **No cloud services** - All data stored locally
- **Offline capable** - Works offline except for AI API and MCP calls

### Plugin Architecture

```
┌─────────────────────────────────────┐
│   AI Coding Assistant               │
│   (Claude Code, Cursor, Aider, etc.)│
└─────────────────────────────────────┘
                 │
┌─────────────────────────────────────┐
│       MT-PRISM Plugin               │
│  ┌─────────────────────────────┐    │
│  │  Skills (Modules)           │    │
│  │  • prism.analyze-prd        │    │
│  │  • prism.analyze-figma      │    │
│  │  • prism.validate           │    │
│  │  • prism.clarify            │    │
│  │  • prism.generate-tdd       │    │
│  │  • prism.discover (full)    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  LLM Abstraction Layer      │    │
│  │  • Anthropic (Claude)       │    │
│  │  • OpenAI (GPT-4)           │    │
│  │  • Google (Gemini)          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
                 │
┌─────────────────────────────────────┐
│    MCPs (Model Context Protocol)    │
│  • Confluence (Atlassian)           │
│  • Figma                            │
│  • Jira (optional)                  │
│  • Slack (optional)                 │
└─────────────────────────────────────┘
```

## Skills Overview

MT-PRISM provides 5 core skills that can be used independently or orchestrated together:

### 1. PRD Analyzer (`prism.analyze-prd`)

**Purpose**: Extract structured requirements from PRD documents

**Capabilities**:
- Parse Confluence pages via Atlassian MCP
- Extract from local files (markdown, PDF, DOCX)
- Classify requirements by type and priority
- Detect ambiguities and missing information
- Generate dependency graphs
- Output: `requirements.yaml`

**Target Performance**: < 2 minutes, 95%+ accuracy

### 2. Figma Analyzer (`prism.analyze-figma`)

**Purpose**: Extract UI specifications from Figma designs

**Capabilities**:
- Fetch Figma data via Figma MCP
- Extract components with variants
- Identify design tokens (colors, typography, spacing)
- Recognize UI patterns (forms, modals, tables)
- Output: `components.yaml`

**Target Performance**: < 3 minutes

### 3. Requirements Validator (`prism.validate`)

**Purpose**: Cross-validate requirements against designs

**Capabilities**:
- Map requirements to UI components
- Detect missing UI for requirements
- Identify Figma components without requirements
- Flag inconsistencies and gaps
- Generate clarification questions
- Output: `gaps.yaml`, `questions.yaml`

**Target Performance**: < 3 minutes, 90%+ gap detection

### 4. Clarification Manager (`prism.clarify`)

**Purpose**: Manage Q&A workflow with stakeholders

**Capabilities**:
- Interactive Q&A mode
- Jira integration for async tickets
- Slack integration for async messages
- Update requirements based on responses
- Trigger re-validation
- Output: Updated `requirements.yaml`

### 5. TDD Generator (`prism.generate-tdd`)

**Purpose**: Generate comprehensive Technical Design Document

**Capabilities**:
- Create 30-50 page TDD with all sections
- Generate OpenAPI 3.1 API specifications
- Produce executable SQL database schemas
- Create implementation task breakdown
- Include architecture diagrams (Mermaid)
- Output: `TDD.md`, `api-spec.yaml`, `database-schema.sql`, `tasks.json`

**Target Performance**: < 5 minutes

### 6. Full Workflow (`prism.discover`)

**Purpose**: Orchestrate complete PRD-to-TDD automation

**Workflow**:
1. Analyze PRD → `requirements.yaml`
2. Analyze Figma → `components.yaml`
3. Validate → `gaps.yaml`, `questions.yaml`
4. Clarify (if gaps found) → Updated requirements
5. Generate TDD → Complete documentation

**Target Performance**: < 20 minutes (excluding stakeholder response time)

## Local File Structure

All data is stored locally in the `.prism/` directory:

```
project-root/
├── .prism/
│   ├── config.yaml           # User configuration
│   ├── session.json          # Current session state
│   ├── outputs/
│   │   ├── requirements.yaml # PRD analysis output
│   │   ├── components.yaml   # Figma analysis output
│   │   ├── gaps.yaml         # Validation output
│   │   ├── questions.yaml    # Clarification questions
│   │   ├── TDD.md            # Generated TDD
│   │   ├── api-spec.yaml     # API specification
│   │   └── database-schema.sql
│   └── cache/                # Optional caching
│       └── <hash>.json
└── .env                      # API keys (gitignored)
```

## LLM Abstraction Layer

All skills use a unified interface for AI provider calls:

```typescript
interface LLMProvider {
  // Generate text completion
  generateText(prompt: string, options?: GenerateOptions): Promise<string>

  // Stream text completion
  streamText(prompt: string, options?: GenerateOptions): AsyncGenerator<string>

  // Generate structured output matching schema
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T>

  // Get provider info
  getInfo(): ProviderInfo

  // Estimate cost for request
  estimateCost(tokens: number): number
}
```

**Supported Providers**:
- **Anthropic**: Claude Sonnet 4.5, Opus, Haiku (~$4/workflow)
- **OpenAI**: GPT-4, GPT-4 Turbo (~$3.50/workflow)
- **Google**: Gemini Pro, Ultra (~$2.50/workflow)

## Environment Configuration

Create `.env` file in project root:

```bash
# Choose primary AI provider
AI_PROVIDER=anthropic  # Options: anthropic, openai, google

# Provider API keys (configure the one(s) you'll use)
ANTHROPIC_API_KEY=sk-ant-xxxxx     # For Claude
OPENAI_API_KEY=sk-xxxxx            # For GPT-4
GOOGLE_API_KEY=xxxxx               # For Gemini

# Optional: Specific model selection (uses defaults if not set)
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
OPENAI_MODEL=gpt-4-turbo
GOOGLE_MODEL=gemini-pro

# MCP Configuration (optional, for Confluence/Figma/etc.)
CONFLUENCE_URL=https://your-domain.atlassian.net
CONFLUENCE_TOKEN=<token>
FIGMA_ACCESS_TOKEN=<token>
JIRA_URL=https://your-domain.atlassian.net
SLACK_TOKEN=<token>
```

## Usage Examples

### Example 1: Analyze PRD from Confluence

```bash
# Via Claude Code
/prism.analyze-prd --source https://company.atlassian.net/wiki/pages/123456

# Via Cursor
Cmd+Shift+P → "PRISM: Analyze PRD"

# Via CLI
prism analyze-prd --source https://company.atlassian.net/wiki/pages/123456
```

Output: `.prism/outputs/requirements.yaml`

### Example 2: Full Discovery Workflow

```bash
# Via Claude Code
/prism.discover \
  --prd https://company.atlassian.net/wiki/pages/123456 \
  --figma https://figma.com/file/abc123/ProjectX

# Via Cursor
Cmd+Shift+P → "PRISM: Full Discovery"

# Via CLI
prism discover \
  --prd https://company.atlassian.net/wiki/pages/123456 \
  --figma https://figma.com/file/abc123/ProjectX
```

Output: Complete `.prism/outputs/` directory with all artifacts

### Example 3: Interactive Clarification

```bash
# Start clarification session
/prism.clarify --questions .prism/outputs/questions.yaml --mode interactive

# Questions presented one by one:
# Q1 [CRITICAL]: Should user profile editing support real-time validation?
# Suggestions: (a) Yes, validate on blur (b) Yes, validate on submit (c) No validation
# Your answer: _
```

## Development Guidelines

### When Implementing Skills

1. **Use LLM Abstraction Layer**: Never call provider SDKs directly
   ```typescript
   // ❌ Bad
   import Anthropic from '@anthropic-ai/sdk'
   const client = new Anthropic(...)

   // ✅ Good
   import { createLLMProvider } from '../utils/llm'
   const llm = await createLLMProvider()
   const result = await llm.generateText(prompt)
   ```

2. **Store All Data Locally**: Use `.prism/` directory
   ```typescript
   // ❌ Bad
   await uploadToS3(data)

   // ✅ Good
   await writeYAML('.prism/outputs/requirements.yaml', data)
   ```

3. **Validate Outputs**: Use Zod schemas
   ```typescript
   import { RequirementsOutputSchema } from '../types/requirement'
   const validated = RequirementsOutputSchema.parse(rawOutput)
   ```

4. **Provide Progress Updates**: Keep users informed
   ```typescript
   console.log('📄 Analyzing PRD...')
   console.log('🤖 Calling AI provider...')
   console.log('✅ Extracted 23 requirements')
   ```

5. **Handle Errors Gracefully**: Provide actionable error messages
   ```typescript
   try {
     await fetchConfluencePage(url)
   } catch (error) {
     if (error.status === 404) {
       throw new Error(
         'PRD not found. Check URL or use local file: prism analyze-prd --source ./local-prd.md'
       )
     }
   }
   ```

### Testing Strategy

```bash
# Unit tests for individual skills
npm run test:unit

# Integration tests with MCP mocks
npm run test:integration

# E2E tests with real APIs (requires test credentials)
npm run test:e2e

# Target: 80%+ code coverage
npm run test:coverage
```

## Project Structure

```
mt-prism/
├── src/
│   ├── skills/           # Skill implementations
│   │   ├── prd-analyzer.ts
│   │   ├── figma-analyzer.ts
│   │   ├── validator.ts
│   │   ├── clarification-manager.ts
│   │   ├── tdd-generator.ts
│   │   └── workflow.ts
│   ├── providers/        # LLM provider implementations
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   ├── google.ts
│   │   └── factory.ts
│   ├── types/           # TypeScript type definitions
│   │   ├── requirement.ts
│   │   ├── component.ts
│   │   ├── gap.ts
│   │   └── session.ts
│   └── utils/           # Shared utilities
│       ├── llm.ts       # LLM abstraction
│       ├── files.ts     # File operations
│       ├── prompts.ts   # Prompt templates
│       └── validation.ts # Schema validation
├── prompts/             # AI prompts for each skill
│   ├── prd-analyzer.md
│   ├── figma-analyzer.md
│   ├── validator.md
│   └── tdd-generator.md
├── templates/           # Output schemas and templates
│   ├── requirements-schema.yaml
│   ├── components-schema.yaml
│   └── tdd-template.md
├── tests/              # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/               # Comprehensive documentation
│   ├── LLM_PROVIDER_GUIDE.md
│   ├── AGENT_INTEGRATION_GUIDE.md
│   ├── MVP_AND_GIT_STRATEGY.md
│   └── LOCAL_FIRST_STRATEGY.md
└── examples/           # Example inputs for testing
    ├── sample-prd.md
    └── sample-figma-data.json
```

## Performance Targets

| Operation | Target | Typical | Notes |
|-----------|--------|---------|-------|
| PRD Analysis | < 2 min | 1m 45s | 5-10 page PRD |
| Figma Analysis | < 3 min | 2m 15s | 20-50 screens |
| Validation | < 3 min | 1m 52s | 20 req + 40 comp |
| TDD Generation | < 5 min | 3m 45s | Full spec |
| **Full Workflow** | **< 20 min** | **~17 min** | **End-to-end** |

## Cost Estimates (Per Workflow)

| Provider | Input Tokens | Output Tokens | Cost/Workflow |
|----------|-------------|---------------|---------------|
| Anthropic Claude | ~40K | ~12K | ~$4.00 |
| OpenAI GPT-4 | ~40K | ~12K | ~$3.50 |
| Google Gemini | ~40K | ~12K | ~$2.50 |

**Annual Cost** (100 workflows/month): $3,000-$4,800 depending on provider

## Git Workflow

Follow the branching strategy defined in `docs/MVP_AND_GIT_STRATEGY.md`:

- `main` - Production releases only
- `develop` - Integration branch
- `feature/*` - Feature development
- `release/*` - Release preparation
- `hotfix/*` - Critical fixes

Use conventional commits:
```bash
feat: add PRD analyzer skill
fix: handle empty Figma components
docs: update README with multi-provider info
test: add validation tests
```

## Key Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview and quick start |
| [QUICKSTART.md](QUICKSTART.md) | 1-hour implementation guide |
| [LLM_PROVIDER_GUIDE.md](docs/LLM_PROVIDER_GUIDE.md) | Multi-provider configuration |
| [AGENT_INTEGRATION_GUIDE.md](docs/AGENT_INTEGRATION_GUIDE.md) | Platform-specific setup |
| [LOCAL_FIRST_STRATEGY.md](docs/LOCAL_FIRST_STRATEGY.md) | Zero-infrastructure approach |
| [MVP_AND_GIT_STRATEGY.md](docs/MVP_AND_GIT_STRATEGY.md) | Development roadmap |

## Success Criteria

- ✅ **95%+ accuracy** in requirement extraction
- ✅ **90%+ gap detection** rate
- ✅ **< 20 minutes** full workflow time
- ✅ **4.5/5** TDD quality rating
- ✅ **Zero infrastructure** costs
- ✅ **$60K total** Year 1 cost (vs $1.3M for full system)

## Active Technologies

**Core Stack**:
- TypeScript 5.3+ for type safety
- Node.js 20 LTS for runtime
- Zod for schema validation
- YAML for data serialization

**AI Provider SDKs**:
- @anthropic-ai/sdk ^0.27.0 (Claude)
- openai ^4.0.0 (GPT-4)
- @google/generative-ai ^0.1.0 (Gemini)

**MCPs**:
- Atlassian MCP (Confluence, Jira)
- Figma MCP
- Slack MCP (optional)

**Development**:
- Vitest for testing
- ESLint + Prettier for code quality

## Recent Changes

**2025-11-19**: Multi-provider support added
- LLM abstraction layer implemented
- Support for Claude, GPT-4, and Gemini
- Provider configuration guide created

**2025-11-19**: Multi-platform support added
- Integration guides for 7 platforms
- Platform-agnostic design
- Comprehensive setup instructions

**2025-11-19**: Local-first strategy documented
- Zero infrastructure approach
- `.prism/` directory structure
- Offline-capable design

---

**For AI Assistants**: This project prioritizes **simplicity**, **local-first design**, and **developer experience**. Always prefer local storage over cloud, simple solutions over complex architectures, and clear documentation over clever code.
