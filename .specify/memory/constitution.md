<!--
Sync Impact Report
==================
Version: 2.0.0 → 3.0.0 (MAJOR: Pivot to Claude Code Plugin Architecture)
Modified Principles:
- Principle I: Agent-First → Skill-First Architecture (skills in Claude Code vs. independent agents)
- Principle VI: Observable Operations → Simplified to local metrics and user feedback
- Principle VII: Contract-Based Integration → MCP-based Integration (simplified for plugin)
Added Sections:
- Plugin Implementation Approach (replaces complex multi-agent infrastructure)
- Simplified Quality Gates for plugin context (5 gates vs. 8)
- Lightweight State Management (local filesystem vs. distributed databases)
- Migration Path to Full System (optional future expansion)
Removed Sections:
- Complex infrastructure requirements (Kubernetes, Kafka, Redis, Neo4j)
- Agent-level detailed specifications (now simplified to skill specs)
- Heavy monitoring requirements (replaced with simple metrics)
- Deployment architecture complexity
Templates Status:
- plan-template.md: ⚠ Needs update to reflect plugin workflow
- spec-template.md: ⚠ Needs update for skill-based outputs
- tasks-template.md: ✅ Compatible (task structure remains)
- checklist-template.md: ⚠ Needs update for simplified gates
Breaking Changes:
- Plugin-first approach replaces multi-agent infrastructure
- Simplified from 6 agents to 5 Claude Code skills
- State management now local (not distributed)
- MCP integrations required but simplified
- Quality gates reduced from 8 to 5 core gates
Follow-up Actions:
- Review and approve plugin-first approach
- Update planning templates for plugin context
- Begin Phase 1 implementation (Week 1-2)
- Validate with first PRD analysis
-->

# MT-PRISM Constitution

## Core Principles

### I. Skill-First Architecture

Every feature MUST be decomposed into discrete Claude Code skills with clear boundaries.
Skills operate within the Claude Code environment, leveraging native tools (Read, Write,
Edit, Bash, Grep, etc.) and MCP servers for external integrations. No complex infrastructure -
skills are self-contained prompt-based capabilities coordinated through simple orchestration.

**Rationale**: Claude Code plugin architecture enables rapid development (4-5 weeks vs. 20 weeks),
zero infrastructure costs, and natural integration with developer workflows. Skills can be
tested independently and composed into workflows without distributed systems complexity.

### II. Document-Driven Discovery

All software development processes MUST begin with formal document analysis (PRD from Confluence,
Figma designs). No implementation without validated requirements. Every requirement must be
traceable from source documents through to TDD. Ambiguities MUST trigger the clarification
workflow before proceeding to TDD generation.

**Rationale**: Automated discovery only works with structured inputs. This principle prevents
scope creep and ensures alignment between business requirements and technical implementation.

### III. Test-First Development (NON-NEGOTIABLE)

TDD is mandatory for all skill implementations and generated TDD outputs. The cycle MUST follow:
- Write tests based on requirements/contracts → Verify tests fail
- Implement minimal code to pass tests
- Refactor while maintaining green tests

Skills must have unit tests (80%+ coverage). Integration tests validate skill interactions.
E2E tests verify complete workflow execution.

**Rationale**: In an automated generation system, tests are the only reliable validation that
generated code meets requirements. Tests serve as executable specifications and ensure quality.

### IV. Iterative Clarification

Ambiguities and gaps identified during validation MUST be resolved through structured
clarification loops with stakeholders. Questions must be categorized (product, design,
engineering), prioritized (critical, high, medium, low), and routed appropriately. Responses
must be incorporated back into requirements. No assumptions without explicit stakeholder
confirmation.

**Rationale**: Automated systems cannot make business decisions. This principle ensures human
oversight remains in the loop for critical decisions while maintaining automation efficiency.

### V. Progressive Enhancement

Features MUST be delivered in independently valuable increments. Each skill must be:
- Independently implementable
- Independently testable
- Independently usable
- Delivering measurable value

Implementation priority: PRD Analyzer → Figma Analyzer → Validator → Clarifier → TDD Generator.
MVP (Phases 1-2) must be viable standalone before adding advanced features.

**Rationale**: This enables rapid feedback cycles and reduces risk by validating core
functionality before building complete workflows.

### VI. Observable Operations

Every skill MUST provide clear progress feedback and status updates. Workflows must emit
structured logs for debugging. Metrics should be collected locally (`.prism/metrics.jsonl`).
User feedback must be solicited post-workflow for continuous improvement.

**Rationale**: While full distributed tracing isn't needed for a plugin, visibility into
skill execution helps users understand progress and enables developers to debug issues.

### VII. MCP-Based Integration

All external service access MUST use Model Context Protocol (MCP) servers. Skills must not
directly implement API clients - they must delegate to MCP servers for:
- Confluence (PRD access, TDD publishing)
- Figma (design file access)
- Jira (clarification ticket creation)
- Slack (stakeholder messaging)

MCP servers must follow the standard JSON-RPC protocol and be versioned independently.

**Rationale**: MCP provides standard protocol for tool integration in Claude Code environment.
This enables reusability, testability, and separation of concerns.

## Skill Responsibilities

The MT-PRISM plugin is composed of five specialized skills, each with distinct responsibilities.
All skills MUST adhere to the Core Principles while fulfilling their designated roles.

### PRD Analyzer Skill (`prism.analyze-prd`)

**Primary Responsibility**: Extract and structure requirements from PRDs

**Required Capabilities**:
- Parse Confluence pages or local files (.md, .pdf, .docx)
- Extract functional and non-functional requirements
- Classify requirements by type, priority, category, complexity
- Detect ambiguities and missing information
- Map dependencies between requirements
- Generate dependency graphs

**Required MCPs**:
- Atlassian MCP for Confluence access
- Optional: Markitdown MCP for PDF conversion

**Deliverables**:
- `requirements.yaml`: Structured requirements with metadata
- `requirements-graph.mmd`: Mermaid dependency diagram
- `prd-analysis-report.md`: Human-readable summary

**Quality Requirements**:
- Extraction accuracy: > 95%
- Processing time: < 2 minutes for typical PRD (5-10 pages)
- Valid YAML output (schema validated)
- Ambiguity detection precision: > 90%

### Figma Analyzer Skill (`prism.analyze-figma`)

**Primary Responsibility**: Extract UI specifications from Figma designs

**Required Capabilities**:
- Parse Figma component trees
- Extract all components and variants (atomic design classification)
- Identify design tokens (colors, typography, spacing)
- Recognize UI patterns (forms, modals, tables, navigation)
- Generate component screenshots
- Check design system consistency

**Required MCPs**:
- Figma MCP for design file access

**Deliverables**:
- `components.yaml`: Component inventory with specifications
- `design-tokens.json`: Extracted design tokens
- `figma-analysis-report.md`: Analysis summary
- `screenshots/`: Component screenshots (PNG)

**Quality Requirements**:
- Component extraction accuracy: > 95%
- Processing time: < 3 minutes for typical file (20-50 screens)
- Design token completeness: > 90%
- Valid YAML output (schema validated)

### Requirements Validator Skill (`prism.validate`)

**Primary Responsibility**: Cross-validate PRD requirements against Figma designs

**Required Capabilities**:
- Requirement-to-component mapping with confidence scoring
- Gap detection (5 types: missing UI, no requirement, incomplete mapping, inconsistencies, missing acceptance criteria)
- Technical feasibility assessment (if codebase provided)
- Clarification question generation
- Traceability matrix creation

**Required MCPs**:
- None (operates on skill outputs from PRD Analyzer and Figma Analyzer)

**Deliverables**:
- `validation-report.md`: Comprehensive validation results
- `gaps.yaml`: Structured gap list with severity
- `clarification-questions.md`: Specific, actionable questions
- `requirement-component-map.yaml`: Full traceability matrix

**Quality Requirements**:
- Gap detection rate: > 90%
- Processing time: < 3 minutes
- Zero false negatives on critical gaps
- Questions are specific and actionable (manual review)

### Clarification Manager Skill (`prism.clarify`)

**Primary Responsibility**: Manage clarification loop with stakeholders

**Required Capabilities**:
- Question categorization by stakeholder type
- Multi-channel distribution (interactive, Jira, Slack, email, file)
- Response collection and parsing
- Automatic requirement updates
- Re-validation triggering

**Required MCPs**:
- Jira MCP for ticket creation (optional)
- Slack MCP for messaging (optional)

**Deliverables**:
- `clarification-summary.md`: Session summary
- `responses.yaml`: All collected answers
- `updated-requirements.yaml`: Requirements with clarifications applied
- `updated-components.yaml`: Component updates (if applicable)

**Quality Requirements**:
- Question delivery: 100% success rate
- Response parsing accuracy: > 95%
- Requirement update correctness: 100% (critical)

### TDD Generator Skill (`prism.generate-tdd`)

**Primary Responsibility**: Generate comprehensive Technical Design Document

**Required Capabilities**:
- System architecture design (monolith/microservices/hybrid decision)
- API specification generation (OpenAPI 3.1)
- Database schema design with indexes
- Frontend architecture with component mapping
- Implementation task breakdown
- Effort estimation (story points)
- Security and performance considerations

**Required MCPs**:
- None (operates on validated requirements and components)

**Deliverables**:
- `TDD.md`: Comprehensive 30-50 page document (12 sections)
- `api-spec.yaml`: Valid OpenAPI 3.1 specification
- `database-schema.sql`: Executable SQL DDL
- `tasks.json`: Implementation task list (Jira/GitHub compatible)
- `types.ts`: TypeScript interfaces from API spec
- `architecture-diagram.mmd`: Mermaid system diagram

**Quality Requirements**:
- Requirements coverage: 100%
- API spec validity: Must pass OpenAPI validation
- SQL executability: Must run without errors
- Task breakdown: Actionable and complete
- Manual quality review: 4.5/5 average rating
- Processing time: < 5 minutes

## Quality Gates

Quality gates are mandatory checkpoints in the discovery workflow. Each skill must pass its
gate criteria before the next skill can execute.

### Analysis Gate (PRD Analyzer + Figma Analyzer)

**Exit Criteria**:
- All PRD sections extracted and structured in YAML format
- All Figma designs analyzed with component inventory generated
- Requirement categorization complete (functional, non-functional, constraints)
- Dependency graph generated
- Traceability matrix created
- At least 95% of PRD content successfully parsed

**Metrics**:
- Number of requirements extracted
- Number of UI components identified
- Parsing success rate
- Processing time

### Validation Gate (Requirements Validator)

**Exit Criteria**:
- Cross-validation between PRD and Figma completed
- All gaps identified and categorized by severity
- Requirement-to-component mapping >85% confidence average
- Clarification questions generated for all critical/high gaps
- Traceability matrix shows coverage >90%

**Metrics**:
- Number of gaps found (by severity)
- Requirement coverage percentage
- Number of clarification questions generated
- Mapping confidence distribution

### Clarification Gate (Clarification Manager)

**Exit Criteria**:
- All critical priority questions answered
- All high priority questions answered OR explicitly deferred
- Stakeholder responses validated and incorporated
- Requirement documents updated with clarifications
- Re-validation shows reduced gaps
- No blocking ambiguities remaining

**Metrics**:
- Number of clarification iterations
- Response rate by stakeholder type
- Time to resolution for critical questions
- Gap reduction (before vs. after)

### TDD Generation Gate (TDD Generator)

**Exit Criteria**:
- TDD covers 100% of validated requirements
- All 12 required sections complete
- Architecture decisions documented with rationale
- API spec passes OpenAPI 3.1 validation
- Database schema is executable SQL
- Task breakdown is actionable (can be imported to project management)
- Diagrams render correctly (Mermaid syntax valid)

**Metrics**:
- Requirements coverage (must be 100%)
- Number of API endpoints specified
- Number of database tables/models
- Number of implementation tasks
- Estimated effort (story points)

### Acceptance Gate (Manual Review)

**Exit Criteria**:
- TDD reviewed by technical lead
- No critical issues found
- Quality rating: 4+/5
- Stakeholder sign-off obtained
- Ready for implementation

**Metrics**:
- Review feedback count
- Issue severity distribution
- Quality rating
- Time to approval

## Automation Standards

### Plugin Workflow

The system follows a five-step workflow executed within Claude Code:

**Step 1: PRD Analysis**
- Load PRD from Confluence or local file
- Execute PRD Analyzer skill
- Output structured requirements

**Step 2: Figma Analysis**
- Load Figma file via MCP
- Execute Figma Analyzer skill
- Output component inventory

**Step 3: Validation**
- Execute Requirements Validator skill
- Identify gaps and generate questions
- Check if clarification needed

**Step 4: Clarification** (conditional, may iterate)
- Execute Clarification Manager skill
- Collect stakeholder responses
- Update requirements
- Re-validate until gaps resolved

**Step 5: TDD Generation**
- Execute TDD Generator skill
- Generate all artifacts
- Output complete TDD package

### State Management

Plugin state is managed through local filesystem:

```
.prism/
├── sessions/
│   └── sess-{timestamp}/
│       ├── session_state.yaml       # Current workflow state
│       ├── 01-prd-analysis/         # Step 1 outputs
│       ├── 02-figma-analysis/       # Step 2 outputs
│       ├── 03-validation/           # Step 3 outputs
│       ├── 04-clarification/        # Step 4 outputs (if needed)
│       └── 05-tdd/                  # Step 5 outputs
├── metrics.jsonl                     # Workflow metrics log
└── .prism-config.yaml               # User configuration
```

### Configuration Format

User configuration (`.prism-config.yaml`):

```yaml
version: 1.0

# MCP Configuration
mcps:
  confluence:
    server: https://company.atlassian.net
    space: PROD
  figma:
    team_id: your-team-id

# Workflow Settings
workflow:
  clarification_mode: interactive  # interactive | jira | slack
  auto_approve_low_priority_gaps: false
  max_clarification_iterations: 3

# Output Settings
output:
  base_directory: .prism
  format: markdown
  include_diagrams: true
```

### Data Formats

All skill outputs MUST use standardized formats:

**Requirements Format** (`requirements.yaml`):
```yaml
metadata:
  prd_source: string
  analyzed_at: ISO8601
  total_requirements: number

requirements:
  - id: string              # REQ-FUNC-001
    type: enum              # functional | non-functional | constraint
    category: string
    priority: enum          # critical | high | medium | low
    complexity: number      # 1-10
    title: string
    description: string
    acceptance_criteria: string[]
    dependencies: string[]
    status: enum
    issues: object[]
```

**Components Format** (`components.yaml`):
```yaml
metadata:
  figma_file_id: string
  total_components: number

components:
  - id: string              # COMP-001
    name: string
    type: string
    category: enum          # atom | molecule | organism
    variants: object[]
    properties: object[]
    design_tokens: object
```

**Gaps Format** (`gaps.yaml`):
```yaml
gaps:
  - id: string              # GAP-001
    type: enum              # missing_ui | no_requirement | inconsistency
    severity: enum
    requirement_id: string
    description: string
    stakeholder: string[]
    question_id: string
```

## Development Standards

### Skill Implementation Requirements

Each skill MUST include:

1. **Prompt Template**: Claude-optimized prompt with:
   - Clear role definition
   - Explicit objectives
   - Detailed guidelines
   - Output format specification
   - Few-shot examples (2-4)
   - Quality checklist

2. **Type Definitions**: TypeScript interfaces for:
   - Input parameters
   - Output structures
   - Intermediate data formats

3. **Validation Logic**: Schema validation using Zod for:
   - Input parameters
   - Claude responses
   - Output files

4. **Error Handling**:
   - MCP connection failures
   - Claude API errors
   - Invalid input handling
   - Graceful degradation

5. **Tests** (80%+ coverage):
   - Unit tests for core logic
   - Integration tests with MCPs
   - Example-based tests with real data

### Prompt Engineering Standards

All Claude prompts MUST follow these guidelines:

- **Temperature**: 0 for analysis tasks, 0.3 for generation tasks
- **Max Tokens**: 8000 for analysis, up to 16000 for TDD generation
- **Structure**: Role → Objectives → Guidelines → Format → Examples → Checklist
- **Examples**: Include 2-4 few-shot examples covering edge cases
- **Output Format**: Specify exact YAML/JSON/Markdown structure
- **Quality Checks**: Include verification checklist at end of prompt

### Performance Requirements

| Skill | Max Time | Token Limit | Accuracy |
|-------|----------|-------------|----------|
| PRD Analyzer | 2 min | 50K tokens | >95% |
| Figma Analyzer | 3 min | 40K tokens | >95% |
| Validator | 3 min | 60K tokens | >90% |
| Clarifier | Real-time | 10K tokens | >95% |
| TDD Generator | 5 min | 100K tokens | 4.5/5 rating |
| **Full Workflow** | **20 min** | **300K tokens** | **E2E success** |

## Migration Path to Full System

### When to Expand

Consider building full multi-agent system when:
- Plugin validates approach (10+ successful projects)
- Need >10 concurrent workflows regularly
- Need scheduled/automated workflows
- Need enterprise dashboards and APIs
- Have budget (~$1.3M) and team (9-12 engineers)

### Reusable Components (70-80%)

From plugin to full system:
- ✅ All prompt templates (reuse directly)
- ✅ Output schemas (reuse directly)
- ✅ Validation logic (port to distributed agents)
- ✅ MCP integrations (same servers)
- ❌ Infrastructure (build new: Kubernetes, databases, etc.)
- ❌ Orchestration (add Temporal/Airflow)
- ❌ Web dashboard (build new: Next.js)

### Architecture Evolution

**Plugin Architecture** (current):
```
Claude Code → Skills → MCPs → External Services
```

**Full System Architecture** (future):
```
API Gateway → Temporal → Agents → Kafka → MCPs → External Services
                ↓
          PostgreSQL + Redis + Neo4j
```

## Governance

### Amendment Process

Constitution changes require:

1. Proposed amendment documented in discussion or issue
2. Impact analysis on existing skills and workflows
3. Review by project maintainers
4. Approval from project lead
5. Version bump following semantic versioning
6. Migration plan for breaking changes (if applicable)

### Versioning Policy

- **MAJOR**: Removing principles, incompatible skill architecture changes, breaking MCP requirements
- **MINOR**: Adding principles, new quality gates, expanded governance, new skill types
- **PATCH**: Clarifications, formatting, typo fixes, metric threshold adjustments

### Compliance Review

All pull requests MUST include:

- Constitution compliance checklist
- Skill responsibility verification
- Quality gate validation
- MCP compatibility check
- Test coverage verification (80%+ for new code)
- Documentation updates

### Skill-Specific Compliance

**PRD Analyzer**:
- Unit test coverage: > 90%
- Integration tests with Confluence MCP
- Performance benchmarks met
- Example-based validation with 5+ real PRDs

**Figma Analyzer**:
- Unit test coverage: > 90%
- Integration tests with Figma MCP
- Component extraction validated with 5+ real files
- Screenshot generation working

**Requirements Validator**:
- Unit test coverage: > 90%
- Gap detection validated (>90% accuracy)
- Question quality validated (manual review)
- Edge cases tested

**Clarification Manager**:
- Unit test coverage: > 85%
- All distribution modes tested (interactive, jira, slack)
- Response parsing validated
- Requirement update logic tested

**TDD Generator**:
- Unit test coverage: > 85%
- OpenAPI validation passing
- SQL syntax validation passing
- TDD quality: 4.5/5 on manual review

## Security & Privacy Requirements

All skills MUST:

- Store credentials in environment variables (never in code or config files)
- Use HTTPS/TLS for all MCP communications
- Sanitize sensitive data from logs and metrics
- Respect user privacy (PRD content sent to Claude API - documented)
- Implement rate limiting for external APIs
- Follow principle of least privilege for MCP access

### Data Privacy

**What Goes to Claude API**:
- PRD content (requirements text)
- Figma component data (names, properties)
- Validation results
- Clarification Q&A

**What Stays Local**:
- API keys and tokens
- User credentials
- Generated TDD files (saved locally)
- Metrics and logs
- Session state

**User Control**:
- Users can delete all workflow data (`.prism/` directory)
- 30-day data retention default (configurable)
- No telemetry without explicit opt-in

## Operational Guidance

This constitution defines the architectural principles, skill responsibilities, and governance
rules for the MT-PRISM plugin. For operational details and development guidance, refer to:

- **README.md**: Project overview and quick start
- **QUICKSTART.md**: Step-by-step implementation guide (1 hour)
- **app_adn.md**: Detailed architecture and implementation specifications
- **docs/specs/**: Individual skill specifications
- **prompts/**: Claude-optimized prompt templates

## Version History

**Version**: 3.0.0 | **Ratified**: 2025-11-05 | **Last Amended**: 2025-11-05

**Changes from 2.0.0**:

- **MAJOR PIVOT**: Restructured for Claude Code plugin architecture (not distributed multi-agent system)
- Replaced "Agent-First" with "Skill-First" architecture principle
- Simplified from 6 agents to 5 Claude Code skills
- Removed complex infrastructure requirements (Kubernetes, Kafka, databases)
- Simplified quality gates from 8 to 5 core gates
- Updated MCP integration requirements for plugin context
- Simplified monitoring to local metrics and user feedback
- Added migration path section for future full system expansion
- Updated all agent responsibilities to skill responsibilities
- Simplified state management to local filesystem

**Migration Notes**:

- This version represents a fundamental architectural pivot from full multi-agent system to Claude Code plugin
- Cost reduction: ~95% ($60K vs. $1.3M Year 1)
- Timeline reduction: 80% (4-5 weeks vs. 20 weeks)
- Infrastructure simplified: Zero infrastructure needed
- All documentation updated to reflect plugin approach
- Prompts and templates created for immediate use
- Implementation can start immediately

**Rationale for MAJOR Version**:

This is a MAJOR version bump because it represents a fundamental change in how the system is
architected, deployed, and operated. While the core mission (PRD-to-TDD automation) remains
unchanged, the implementation approach is completely different. However, the system can still
migrate to the full multi-agent architecture in the future, reusing 70-80% of the work.

---

**Previous Version (2.0.0)**: Full multi-agent system with distributed infrastructure
**Current Version (3.0.0)**: Claude Code plugin with optional future expansion to full system
