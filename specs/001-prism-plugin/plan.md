# Implementation Plan: MT-PRISM Claude Code Plugin

**Branch**: `001-prism-plugin` | **Date**: 2025-11-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/home/james/Documents/Projects/ai/mt-prism/specs/001-prism-plugin/spec.md`

## Summary

MT-PRISM is a local-first AI plugin that automates the PRD-to-TDD discovery process through 5 specialized skills: PRD Analyzer, Figma Analyzer, Requirements Validator, Clarification Manager, and TDD Generator. The plugin runs within any AI coding assistant (Claude Code, Cursor, Aider, etc.), requires zero infrastructure, and uses an LLM abstraction layer to support multiple AI providers (Claude, GPT-4, Gemini). The system completes full workflows in under 20 minutes with 95%+ requirement extraction accuracy and 90%+ gap detection rate, delivering a complete TDD with API specs, database schemas, and task breakdowns. Key features: automatic provider fallback (Claude → GPT-4 → Gemini), atomic writes for data integrity, 5 checkpoint-based resume capability, and TDD-enforced development workflow.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 20 LTS
**Primary Dependencies**:
- AI Provider SDKs: @anthropic-ai/sdk ^0.27.0, openai ^4.0.0, @google/generative-ai ^0.1.0
- Schema/Validation: zod ^3.22.0, yaml ^2.3.0
- Testing: vitest ^1.0.0
- MCPs: @modelcontextprotocol/server-atlassian, custom Figma MCP (TBD), Slack/Jira MCPs (optional)

**Storage**: Local filesystem only (`.prism/` directory for session state and outputs, atomic writes with temp-validate-rename pattern)
**Testing**: Vitest for unit/integration tests, 80%+ coverage requirement, provider-agnostic test suite (must pass with all 3 AI providers)
**Target Platform**: Any AI coding assistant environment (Claude Code, Cursor, GitHub Copilot CLI, Aider, Windsurf, OpenAI Codex, VS Code Copilot)
**Project Type**: Single project (plugin) - Node.js library with CLI entry points  
**Performance Goals**: 
- PRD analysis: <2 min for 5-10 page documents
- Figma analysis: <3 min for 20-50 screens
- Validation: <3 min for 10-30 requirements + 20-50 components
- TDD generation: <5 min for complete 30-50 page document
- Full workflow: <20 min end-to-end (excluding stakeholder wait time)

**Constraints**:
- Zero infrastructure (no servers, databases, or cloud services)
- Offline-capable except for MCP and AI provider API calls
- Per-workflow cost: < $5 (varies by provider: Claude ~$4, GPT-4 ~$3.50, Gemini ~$2.50)
- Must work identically across all supported AI providers (functional equivalence required)
- Session state must persist across AI assistant restarts
- Atomic writes required for all outputs (temp → validate → atomic rename)
- 5 checkpoint boundaries: after each skill completes (PRD, Figma, validation, clarification, TDD)

**Scale/Scope**: 
- Typical: 10-30 requirements, 20-50 UI components
- PRD size: 5-10 pages standard, up to 20 pages supported
- Concurrent users: 1 per Claude Code session
- Session retention: 30 days default (configurable)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Skill-First Architecture ✅
- **Status**: COMPLIANT
- **Evidence**: System decomposed into 5 discrete skills (PRD Analyzer, Figma Analyzer, Requirements Validator, Clarification Manager, TDD Generator), each with clear boundaries and independent functionality
- **Notes**: Skills operate within Claude Code environment using native tools and MCPs

### Principle II: Document-Driven Discovery ✅
- **Status**: COMPLIANT
- **Evidence**: All workflows begin with PRD analysis (Confluence/local) and Figma designs. No TDD generation without validated requirements. Ambiguities trigger mandatory clarification loop
- **Notes**: Requirements are traceable from source documents through to TDD

### Principle III: Test-First Development ✅
- **Status**: COMPLIANT
- **Evidence**: 80%+ test coverage required, unit tests for all skills, integration tests for MCP interactions, E2E tests for full workflow
- **Notes**: Testing strategy defined in spec.md and will be enforced in implementation

### Principle IV: Iterative Clarification ✅
- **Status**: COMPLIANT
- **Evidence**: Dedicated Clarification Manager skill handles gaps, questions categorized by stakeholder type, responses incorporated back into requirements
- **Notes**: No assumptions without stakeholder confirmation; max 3 clarification iterations configured

### Principle V: Progressive Enhancement ✅
- **Status**: COMPLIANT
- **Evidence**: Skills independently implementable, testable, and usable. Implementation order: PRD Analyzer (Week 2) → Figma Analyzer (Week 2) → Validator (Week 3) → Clarifier (Week 3) → TDD Generator (Week 4)
- **Notes**: MVP (Phases 1-2) provides standalone value before complete workflow

### Principle VI: Observable Operations ✅
- **Status**: COMPLIANT
- **Evidence**: Progress feedback at each step, structured logs, metrics collected to .prism/metrics.jsonl, post-workflow user feedback solicitation
- **Notes**: Simplified observability for plugin context (no distributed tracing needed)

### Principle VII: MCP-Based Integration ✅
- **Status**: COMPLIANT
- **Evidence**: All external services accessed via MCPs (Confluence MCP, Figma MCP, Jira MCP, Slack MCP). Skills never implement direct API clients
- **Notes**: MCPs follow JSON-RPC protocol over standard transport

### Principle VIII: LLM Provider Abstraction ✅
- **Status**: COMPLIANT
- **Evidence**: Multi-provider support via abstraction layer (spec updated 2025-11-19). Supports Claude, GPT-4, Gemini. Automatic fallback chain implemented (FR-054, FR-055, FR-056). Provider-agnostic skills (NFR-019, NFR-020). Configuration-based provider selection (.env file)
- **Notes**: Skills use unified LLM interface, never call provider SDKs directly. Cross-provider testing required (all tests must pass with all 3 providers). Functionally equivalent outputs required across providers

### Constitution Version
- **Applied**: v3.1.0 (Multi-Provider LLM Support)
- **Ratified**: 2025-11-05, Last Amended: 2025-11-20

## Project Structure

### Documentation (this feature)

```text
specs/001-prism-plugin/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (technology choices)
├── data-model.md        # Phase 1 output (6 key entities)
├── quickstart.md        # Phase 1 output (developer getting started)
├── contracts/           # Phase 1 output (schema files)
│   ├── requirements.yaml
│   ├── components.yaml
│   ├── gaps.yaml
│   ├── questions.yaml
│   ├── session.yaml
│   └── tdd.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── skills/              # 5 skill implementations
│   ├── prd-analyzer.ts
│   ├── figma-analyzer.ts
│   ├── validator.ts
│   ├── clarification-manager.ts
│   └── tdd-generator.ts
├── providers/           # LLM provider implementations
│   ├── anthropic.ts
│   ├── openai.ts
│   ├── google.ts
│   ├── factory.ts
│   └── types.ts
├── types/               # TypeScript type definitions
│   ├── requirement.ts
│   ├── component.ts
│   ├── gap.ts
│   ├── session.ts
│   └── tdd.ts
├── utils/               # Shared utilities
│   ├── llm.ts           # LLM abstraction layer
│   ├── files.ts         # File operations (atomic writes)
│   ├── prompts.ts       # Prompt templates
│   ├── validation.ts    # Schema validation
│   └── mcp.ts           # MCP client utilities
├── workflows/           # Orchestration
│   └── discover.ts      # Full PRD-to-TDD workflow
└── cli.ts               # CLI entry point

tests/
├── unit/                # Unit tests per skill
│   ├── prd-analyzer.test.ts
│   ├── figma-analyzer.test.ts
│   ├── validator.test.ts
│   ├── clarification-manager.test.ts
│   └── tdd-generator.test.ts
├── integration/         # Integration tests with MCPs
│   ├── confluence-mcp.test.ts
│   ├── figma-mcp.test.ts
│   └── workflow.test.ts
└── providers/           # Provider-agnostic tests
    ├── anthropic.test.ts
    ├── openai.test.ts
    └── google.test.ts

prompts/                 # AI prompts for each skill
├── prd-analyzer.md
├── figma-analyzer.md
├── validator.md
├── clarification-manager.md
└── tdd-generator.md

templates/               # Output schemas and templates
├── requirements-schema.yaml
├── components-schema.yaml
├── gaps-schema.yaml
├── questions-schema.yaml
├── tdd-template.md
└── api-spec-template.yaml

examples/                # Example inputs for testing
├── sample-prd.md
├── sample-figma-data.json
└── sample-confluence-export.html

.prism/                  # Runtime state (gitignored)
├── sessions/
│   └── sess-{timestamp}/
│       ├── session_state.yaml
│       ├── 01-prd-analysis/
│       ├── 02-figma-analysis/
│       ├── 03-validation/
│       ├── 04-clarification/
│       └── 05-tdd/
├── metrics.jsonl
└── .prism-config.yaml
```

**Structure Decision**: Single project structure selected as this is a unified plugin with skill-based internal decomposition. No separate backend/frontend or multi-project monorepo needed. All skills share common utilities (LLM abstraction, file operations, validation) making a single codebase optimal. The `.prism/` directory provides local state management without requiring separate services.

## Complexity Tracking

*No constitutional violations detected. This section intentionally left blank.*

The implementation adheres to all core principles without requiring any exceptions or complexity additions.
