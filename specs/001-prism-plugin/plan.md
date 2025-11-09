# Implementation Plan: MT-PRISM Claude Code Plugin

**Branch**: `001-prism-plugin` | **Date**: 2025-11-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/home/james/Documents/Projects/ai/mt-prism/specs/001-prism-plugin/spec.md`

## Summary

MT-PRISM is a Claude Code plugin that automates the PRD-to-TDD discovery process through five specialized skills: PRD Analyzer (extracts structured requirements from Confluence/local PRDs in <2 min with 95%+ accuracy), Figma Analyzer (extracts UI components and design tokens in <3 min), Requirements Validator (cross-validates requirements vs designs, detects gaps in <3 min), Clarification Manager (manages interactive/async Q&A with stakeholders), and TDD Generator (creates comprehensive TDD with API specs, database schemas, and task breakdowns in <5 min). The full workflow completes in <20 minutes and requires zero infrastructure, leveraging MCPs for external integrations.

## Technical Context

**Language/Version**: TypeScript 5.3+  
**Primary Dependencies**: @anthropic-ai/sdk ^0.27.0, yaml ^2.3.4, zod ^3.22.4  
**Storage**: Local filesystem (.prism/ directory for session state, outputs, and metrics)  
**Testing**: Vitest 1.0+ with 80%+ coverage target  
**Target Platform**: Claude Code environment (cross-platform: Linux, macOS, Windows)  
**Project Type**: single (Claude Code plugin/CLI tool)  
**Performance Goals**: 
- PRD analysis: <2 min for 5-10 page documents
- Figma analysis: <3 min for 20-50 screens
- Validation: <3 min for 10-30 requirements + 20-50 components
- TDD generation: <5 min for complete 30-50 page document
- Full workflow: <20 min end-to-end (excluding stakeholder wait time)

**Constraints**: 
- Zero infrastructure (no servers, databases, or cloud services)
- Local-only state management
- MCP-based integrations only
- Claude API cost: ~$3-5 per workflow
- Single-user per session
- Must work offline except for MCP/API calls

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

### Constitution Version
- **Applied**: v3.0.0 (Skill-First Architecture)
- **Ratified**: 2025-11-05

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
├── skills/              # Core plugin skills
│   ├── prd-analyzer.ts
│   ├── figma-analyzer.ts
│   ├── validator.ts
│   ├── clarification-manager.ts
│   └── tdd-generator.ts
├── workflow/            # Orchestration logic
│   ├── discovery-workflow.ts
│   ├── session-manager.ts
│   └── checkpoint.ts
├── mcp/                 # MCP client implementations
│   ├── confluence-client.ts
│   ├── figma-client.ts
│   ├── jira-client.ts
│   └── slack-client.ts
├── lib/                 # Shared utilities
│   ├── claude-client.ts
│   ├── prompt-loader.ts
│   ├── yaml-parser.ts
│   ├── schema-validator.ts
│   └── file-utils.ts
├── types/               # TypeScript type definitions
│   ├── requirements.ts
│   ├── components.ts
│   ├── gaps.ts
│   ├── questions.ts
│   ├── session.ts
│   └── tdd.ts
└── cli/                 # Command-line interface
    └── index.ts

tests/
├── contract/            # Schema validation tests
│   ├── requirements.test.ts
│   ├── components.test.ts
│   └── gaps.test.ts
├── integration/         # MCP and skill integration tests
│   ├── confluence-mcp.test.ts
│   ├── figma-mcp.test.ts
│   ├── prd-analyzer.test.ts
│   └── workflow.test.ts
└── unit/                # Unit tests for core logic
    ├── prd-analyzer.test.ts
    ├── figma-analyzer.test.ts
    ├── validator.test.ts
    ├── clarification-manager.test.ts
    └── tdd-generator.test.ts

fixtures/                # Test data
├── sample-prd.md
├── sample-figma.json
└── sample-requirements.yaml

prompts/                 # Already exists - Claude prompt templates
├── prd-analyzer.md
├── figma-analyzer.md
├── validator.md
├── clarification-manager.md
└── tdd-generator.md

templates/               # Already exists - Output schemas
├── requirement.yaml
├── component.yaml
└── tdd-template.md
```

**Structure Decision**: Single project structure selected because MT-PRISM is a unified Claude Code plugin with all skills running in a single Node.js process. No frontend/backend separation needed. Skills are logical modules, not separate services. This simplifies development, testing, and deployment while maintaining clear boundaries through TypeScript modules.

## Complexity Tracking

*No constitutional violations detected. This section intentionally left blank.*

The implementation adheres to all core principles without requiring any exceptions or complexity additions.
