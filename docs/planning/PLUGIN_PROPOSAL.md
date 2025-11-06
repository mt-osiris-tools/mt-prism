# MT-PRISM Claude Code Plugin Proposal

**Version**: 1.0
**Date**: 2025-11-05
**Status**: Planning Phase

---

## Executive Summary

MT-PRISM will be implemented as a **Claude Code plugin** that automates the PRD-to-TDD workflow directly within the Claude Code environment. This approach provides:

- **Faster Development**: 2-4 weeks vs. 20 weeks
- **Immediate Value**: Works within existing Claude Code workflow
- **Lower Cost**: No infrastructure, leverages existing MCPs
- **Easy Adoption**: Users already have Claude Code
- **Rapid Iteration**: Quick feedback and improvements

---

## What is a Claude Code Plugin?

Claude Code plugins are specialized agents that:
- Extend Claude Code's capabilities with domain-specific knowledge
- Can be invoked via custom commands or automatically
- Have access to all Claude Code tools (Read, Write, Edit, Bash, Grep, etc.)
- Can integrate with MCP servers (Confluence, Jira, Figma, etc.)
- Run in the same environment as Claude Code

---

## Plugin Architecture

### Plugin Structure

```
mt-prism/
├── plugin.json                 # Plugin manifest
├── README.md                   # Plugin documentation
├── prompts/
│   ├── main.md                 # Main agent prompt
│   ├── prd-analyzer.md         # PRD analysis sub-prompt
│   ├── figma-analyzer.md       # Figma analysis sub-prompt
│   ├── validator.md            # Requirements validation
│   ├── clarification.md        # Clarification management
│   └── tdd-generator.md        # TDD generation
├── templates/
│   ├── requirement.yaml        # Requirement format
│   ├── tdd-template.md         # TDD document template
│   └── validation-report.md    # Validation report template
├── skills/
│   ├── analyze-prd.md          # Skill: Analyze PRD
│   ├── analyze-figma.md        # Skill: Analyze Figma
│   ├── validate.md             # Skill: Cross-validate
│   ├── clarify.md              # Skill: Manage clarifications
│   └── generate-tdd.md         # Skill: Generate TDD
└── workflows/
    ├── full-discovery.md       # End-to-end workflow
    ├── quick-analysis.md       # Fast PRD analysis only
    └── validation-only.md      # Validate existing requirements
```

### Plugin Manifest (plugin.json)

```json
{
  "name": "mt-prism",
  "version": "1.0.0",
  "description": "Automated PRD-to-TDD discovery and validation",
  "author": "Your Organization",
  "type": "specialized-agent",
  "entrypoint": "prompts/main.md",
  "commands": [
    {
      "name": "prism.discover",
      "description": "Start full PRD-to-TDD discovery workflow",
      "skill": "workflows/full-discovery.md"
    },
    {
      "name": "prism.analyze-prd",
      "description": "Analyze PRD and extract requirements",
      "skill": "skills/analyze-prd.md"
    },
    {
      "name": "prism.analyze-figma",
      "description": "Analyze Figma designs and extract UI specs",
      "skill": "skills/analyze-figma.md"
    },
    {
      "name": "prism.validate",
      "description": "Cross-validate requirements against designs",
      "skill": "skills/validate.md"
    },
    {
      "name": "prism.clarify",
      "description": "Generate and manage clarification questions",
      "skill": "skills/clarify.md"
    },
    {
      "name": "prism.generate-tdd",
      "description": "Generate Technical Design Document",
      "skill": "skills/generate-tdd.md"
    }
  ],
  "mcps_required": [
    "mcp-atlassian",
    "mcp-figma"
  ],
  "mcps_optional": [
    "mcp-slack",
    "mcp-jira"
  ],
  "tools": [
    "Read",
    "Write",
    "Edit",
    "Grep",
    "Glob",
    "Bash",
    "WebFetch"
  ]
}
```

---

## Plugin Capabilities

### 1. PRD Analysis (`prism.analyze-prd`)

**Input**:
- Confluence URL or local markdown file
- Optional: PRD template for validation

**Process**:
1. Fetch PRD content via MCP or Read tool
2. Parse and extract:
   - Functional requirements
   - Non-functional requirements
   - User stories
   - Acceptance criteria
   - Stakeholder information
3. Classify requirements (priority, complexity, category)
4. Detect ambiguities and missing information
5. Build requirement dependency graph

**Output**:
- `requirements.yaml` - Structured requirements
- `requirements-graph.mmd` - Mermaid dependency diagram
- `prd-analysis-report.md` - Analysis summary

**Example Usage**:
```bash
# Via Claude Code
> /prism.analyze-prd https://company.atlassian.net/wiki/spaces/PROD/pages/123456

# Or in conversation
User: Analyze the PRD at [Confluence URL]
Claude Code: [Automatically invokes prism.analyze-prd skill]
```

---

### 2. Figma Analysis (`prism.analyze-figma`)

**Input**:
- Figma file URL or ID
- Optional: Design system reference

**Process**:
1. Fetch Figma file via MCP
2. Extract component tree
3. Identify:
   - All components and variants
   - Design tokens (colors, typography, spacing)
   - UI patterns (forms, modals, tables, etc.)
   - Component properties
4. Compare against design system (if provided)
5. Generate component inventory

**Output**:
- `components.yaml` - Component inventory
- `design-tokens.json` - Extracted design tokens
- `figma-analysis-report.md` - Analysis summary
- `screenshots/` - Component screenshots

**Example Usage**:
```bash
> /prism.analyze-figma https://figma.com/file/abc123/ProjectName
```

---

### 3. Cross-Validation (`prism.validate`)

**Input**:
- `requirements.yaml` (from PRD analysis)
- `components.yaml` (from Figma analysis)
- Optional: Existing codebase path

**Process**:
1. Map requirements to UI components
2. Identify gaps:
   - Requirements with no UI mockup
   - UI components with no requirement
   - Inconsistencies between PRD and Figma
3. Technical feasibility check:
   - Analyze existing codebase (if provided)
   - Flag technically challenging requirements
   - Identify reusable patterns
4. Generate validation report
5. Create targeted clarification questions

**Output**:
- `validation-report.md` - Comprehensive validation results
- `gaps.yaml` - Structured list of all gaps
- `clarification-questions.md` - Questions for stakeholders
- `requirement-component-map.yaml` - Traceability matrix

**Example Usage**:
```bash
> /prism.validate --requirements requirements.yaml --components components.yaml --codebase ./src
```

---

### 4. Clarification Management (`prism.clarify`)

**Input**:
- `clarification-questions.md`
- Stakeholder mapping configuration

**Process**:
1. Categorize questions by stakeholder type:
   - Product (business logic, requirements)
   - Design (UI/UX, visual design)
   - Engineering (technical feasibility)
2. Send questions via available channels:
   - Jira issues (via MCP)
   - Slack messages (via MCP)
   - Email (via external tool)
   - Markdown file for manual distribution
3. Track question status
4. Collect and parse responses
5. Update requirements based on answers
6. Re-trigger validation if needed

**Output**:
- `clarifications/` directory:
  - `product-questions.md`
  - `design-questions.md`
  - `engineering-questions.md`
  - `responses.yaml` - Collected answers
  - `updated-requirements.yaml` - Updated requirements

**Example Usage**:
```bash
> /prism.clarify --questions clarification-questions.md --mode interactive
```

**Interactive Mode**:
- Claude Code asks questions one by one
- User provides answers in conversation
- Updates applied immediately

---

### 5. TDD Generation (`prism.generate-tdd`)

**Input**:
- `requirements.yaml` (validated)
- `components.yaml`
- `requirement-component-map.yaml`
- Optional: Codebase analysis
- Optional: TDD template

**Process**:
1. Generate TDD sections:
   - **Overview**: Project goals and scope
   - **Requirements**: Detailed functional/non-functional requirements
   - **Architecture**: System architecture diagram
   - **Data Models**: Database schemas, entities
   - **API Specification**: OpenAPI 3.1 spec
   - **Frontend Architecture**: Component structure, routing
   - **UI Components**: Component specifications from Figma
   - **Implementation Plan**: Phased approach
   - **Testing Strategy**: Unit, integration, E2E tests
   - **Deployment**: Infrastructure and rollout plan
2. Generate supporting artifacts:
   - API spec (OpenAPI YAML)
   - Database migration scripts
   - Component stubs (TypeScript interfaces)
3. Create task breakdown (Jira-ready)
4. Estimate effort (story points)

**Output**:
- `TDD.md` - Comprehensive Technical Design Document
- `api-spec.yaml` - OpenAPI specification
- `database-schema.sql` - Database DDL
- `tasks.yaml` - Implementation task breakdown
- `architecture-diagram.mmd` - Mermaid diagram

**Example Usage**:
```bash
> /prism.generate-tdd --requirements requirements.yaml --template templates/tdd-template.md
```

---

### 6. Full Discovery Workflow (`prism.discover`)

**Input**:
- Confluence PRD URL
- Figma design URL
- Optional: Codebase path
- Optional: Configuration file

**Process**:
Orchestrates all skills in sequence:

1. **Analyze PRD** → `requirements.yaml`
2. **Analyze Figma** → `components.yaml`
3. **Validate** → `validation-report.md`, `clarification-questions.md`
4. **Clarify** (if gaps found):
   - Send questions
   - Wait for responses (interactive or async)
   - Update requirements
   - Re-validate
5. **Generate TDD** → `TDD.md` and artifacts

**Output**:
All outputs from individual skills, organized:
```
.prism/
├── discovery-{timestamp}/
│   ├── 01-prd-analysis/
│   │   ├── requirements.yaml
│   │   ├── requirements-graph.mmd
│   │   └── prd-analysis-report.md
│   ├── 02-figma-analysis/
│   │   ├── components.yaml
│   │   ├── design-tokens.json
│   │   ├── figma-analysis-report.md
│   │   └── screenshots/
│   ├── 03-validation/
│   │   ├── validation-report.md
│   │   ├── gaps.yaml
│   │   ├── clarification-questions.md
│   │   └── requirement-component-map.yaml
│   ├── 04-clarifications/
│   │   ├── questions-sent.md
│   │   ├── responses.yaml
│   │   └── updated-requirements.yaml
│   └── 05-tdd/
│       ├── TDD.md
│       ├── api-spec.yaml
│       ├── database-schema.sql
│       ├── tasks.yaml
│       └── architecture-diagram.mmd
└── .prism-config.yaml
```

**Example Usage**:
```bash
> /prism.discover --prd https://company.atlassian.net/wiki/123 --figma https://figma.com/file/abc123
```

---

## Configuration

### `.prism-config.yaml`

```yaml
# MT-PRISM Configuration
version: 1.0

# MCP Configuration
mcps:
  confluence:
    server: https://company.atlassian.net
    space: PROD
  figma:
    team_id: your-team-id
  jira:
    project: ENG
  slack:
    channels:
      product: "#product-questions"
      design: "#design-questions"
      engineering: "#eng-questions"

# Requirements Configuration
requirements:
  classification:
    priorities: [critical, high, medium, low]
    categories: [feature, enhancement, bug-fix, technical-debt]
  validation:
    require_acceptance_criteria: true
    require_ui_mockup: true
    flag_complexity_threshold: 8  # story points

# TDD Configuration
tdd:
  template: templates/tdd-template.md
  include_api_spec: true
  include_database_schema: true
  include_task_breakdown: true
  task_platform: jira  # or github, linear

# Workflow Configuration
workflow:
  clarification_mode: interactive  # or async
  clarification_timeout_days: 3
  auto_publish_tdd: false
  publish_target: confluence  # or local, github

# Output Configuration
output:
  directory: .prism
  format: markdown  # markdown, pdf, html
  include_diagrams: true
  diagram_format: mermaid  # mermaid, plantuml
```

---

## Simplified Tech Stack

### No Infrastructure Needed
- **Runtime**: Claude Code environment
- **Storage**: Local filesystem
- **State**: Managed by Claude Code
- **Orchestration**: Claude Code conversation flow

### Required Dependencies
- **MCPs** (Model Context Protocol servers):
  - `@modelcontextprotocol/server-atlassian` (Confluence + Jira)
  - Custom Figma MCP (if not available)
  - `@modelcontextprotocol/server-slack` (optional)

### Plugin Components
- **Prompts**: Markdown files with specialized instructions
- **Templates**: Reusable document templates
- **Workflows**: Multi-step skill orchestrations
- **Configuration**: YAML configuration file

---

## Implementation Plan

### Phase 1: Core Plugin Framework (Week 1)

**Duration**: 5 days
**Team**: 1-2 developers

**Tasks**:
1. Create plugin directory structure
2. Write `plugin.json` manifest
3. Create base prompt (`prompts/main.md`)
4. Write core templates
5. Set up development environment
6. Test plugin loading in Claude Code

**Deliverables**:
- [ ] Plugin structure created
- [ ] Manifest complete
- [ ] Base prompt functional
- [ ] Plugin loads in Claude Code

---

### Phase 2: PRD & Figma Analysis Skills (Week 2)

**Duration**: 5 days
**Team**: 1-2 developers

**Tasks**:

**Days 1-2: PRD Analyzer**
1. Write `skills/analyze-prd.md` skill prompt
2. Implement Confluence MCP integration
3. Build requirement extraction logic
4. Create requirement classification
5. Generate dependency graph
6. Test with sample PRDs

**Days 3-5: Figma Analyzer**
1. Write `skills/analyze-figma.md` skill prompt
2. Implement Figma MCP integration (or build simple one)
3. Build component extraction logic
4. Extract design tokens
5. Generate component inventory
6. Test with sample Figma files

**Deliverables**:
- [ ] PRD analysis working end-to-end
- [ ] Figma analysis working end-to-end
- [ ] Tested with 3+ real examples each
- [ ] Documentation complete

---

### Phase 3: Validation & Clarification (Week 3)

**Duration**: 5 days
**Team**: 1-2 developers

**Tasks**:

**Days 1-3: Validator**
1. Write `skills/validate.md` skill prompt
2. Build requirement-to-component mapping logic
3. Implement gap detection algorithms
4. Add codebase analysis (optional)
5. Generate validation reports
6. Test with sample data

**Days 4-5: Clarification Manager**
1. Write `skills/clarify.md` skill prompt
2. Implement question categorization
3. Add Jira integration (create issues)
4. Add Slack integration (send messages)
5. Build interactive Q&A flow
6. Test clarification workflow

**Deliverables**:
- [ ] Validation working accurately
- [ ] Clarification workflow functional
- [ ] Jira/Slack integration working
- [ ] Interactive mode tested

---

### Phase 4: TDD Generation & Full Workflow (Week 4)

**Duration**: 5 days
**Team**: 1-2 developers

**Tasks**:

**Days 1-3: TDD Generator**
1. Write `skills/generate-tdd.md` skill prompt
2. Create comprehensive TDD template
3. Build TDD section generators
4. Generate OpenAPI specs
5. Generate database schemas
6. Create task breakdown
7. Test with validated requirements

**Days 4-5: Full Workflow**
1. Write `workflows/full-discovery.md`
2. Orchestrate all skills in sequence
3. Handle errors and retries
4. Add progress reporting
5. Test end-to-end workflow
6. Polish and optimize

**Deliverables**:
- [ ] TDD generation working
- [ ] Full workflow functional end-to-end
- [ ] Tested with 2+ real projects
- [ ] Performance acceptable (< 10 min)

---

### Phase 5: Polish & Documentation (Days 21-25)

**Duration**: 3-5 days
**Team**: 1-2 developers + technical writer

**Tasks**:
1. Write comprehensive README
2. Create user guide with examples
3. Record demo video
4. Create troubleshooting guide
5. Write contribution guide
6. Test installation on fresh Claude Code
7. Gather beta feedback
8. Polish based on feedback

**Deliverables**:
- [ ] Documentation complete
- [ ] Demo video published
- [ ] Beta tested by 3+ users
- [ ] Feedback incorporated
- [ ] Ready for release

---

## Total Timeline: 4-5 Weeks

**Compared to full system**: 20 weeks → **4 weeks (80% faster)**

---

## Advantages of Plugin Approach

### 1. Speed to Market
- **4-5 weeks** vs. 20 weeks for full system
- No infrastructure setup
- No deployment complexity
- Iterate quickly based on feedback

### 2. Lower Cost
- **~$50-80K** vs. $1.3M+ for full system
- No infrastructure costs (~$61K/year saved)
- Smaller team (1-2 vs. 9-12 engineers)
- No ongoing maintenance infrastructure

### 3. Better User Experience
- Works in familiar Claude Code environment
- No new tools to learn
- Integrated with existing workflow
- Real-time interaction and feedback

### 4. Easier Adoption
- Users already have Claude Code
- Install plugin and go
- No authentication setup
- No deployment needed

### 5. Flexibility
- Easy to customize per project
- Users can modify prompts/templates
- Can fork and extend
- Works offline (except MCP calls)

### 6. Future-Proof
- Can be expanded to full system later
- Plugin as proof-of-concept
- Validate assumptions before big investment
- Learn what users actually need

---

## Migration Path to Full System

If plugin proves successful, expand to full system:

1. **Months 1-2**: Plugin development and beta
2. **Months 3-4**: Gather usage data and feedback
3. **Month 5**: Decision point
   - **Option A**: Keep as plugin (if sufficient)
   - **Option B**: Build full system (if needed)
4. **Months 6-11**: Full system development (Phase 1-6 from original plan)
5. **Month 12**: Full system launch, plugin remains as lightweight option

---

## Budget Estimation

### Development Costs (4-5 weeks)

**Personnel** (2 engineers @ $150/hr):
- Phase 1: 80 hours → $12,000
- Phase 2: 80 hours → $12,000
- Phase 3: 80 hours → $12,000
- Phase 4: 80 hours → $12,000
- Phase 5: 40 hours → $6,000
- **Total**: ~**$54,000**

### Infrastructure Costs

**Zero** - No infrastructure needed!

### API Costs (for 100 workflows/month)
- Claude API: ~$500/month (via Claude Code)
- Confluence/Figma APIs: Free (within limits)
- **Total**: ~**$6,000/year**

### Total First Year Cost
- **Development**: $54,000 (one-time)
- **API**: $6,000/year
- **Total**: **~$60,000**

**Savings vs. Full System**: $1,261,200 (95% cost reduction!)

---

## Success Metrics

### Phase 1-2 (Weeks 1-2)
- [ ] Plugin loads and basic skills functional
- [ ] PRD analysis 90%+ accurate on test corpus
- [ ] Figma analysis extracts all components

### Phase 3-4 (Weeks 3-4)
- [ ] Validation identifies 90%+ of gaps
- [ ] TDD generation produces comprehensive output
- [ ] Full workflow completes successfully

### Phase 5 (Week 5)
- [ ] Beta tested by 3+ users
- [ ] Documentation complete
- [ ] 4.5/5 satisfaction rating

### Post-Launch (First 3 Months)
- [ ] 10+ active users
- [ ] 5+ successful projects completed
- [ ] < 10 min for full discovery workflow
- [ ] 4.5/5+ sustained satisfaction
- [ ] Positive ROI demonstrated

---

## Next Steps

### Week 1: Get Started
1. **Day 1**:
   - Review and approve plugin proposal
   - Set up development environment
   - Create GitHub repository
2. **Day 2-3**:
   - Build plugin structure
   - Write plugin manifest
   - Create base prompts
3. **Day 4-5**:
   - Test basic plugin loading
   - Start PRD analyzer skill
   - Begin documentation

### Immediate Prerequisites
- [ ] Claude Code installed and configured
- [ ] Access to Confluence instance (for testing)
- [ ] Access to Figma files (for testing)
- [ ] MCP servers installed (Atlassian, Figma)
- [ ] Sample PRDs and Figma files ready

---

## Conclusion

**Building MT-PRISM as a Claude Code plugin provides**:
- ✅ **95% cost reduction** ($60K vs. $1.3M)
- ✅ **80% faster time to market** (4 weeks vs. 20 weeks)
- ✅ **Zero infrastructure complexity**
- ✅ **Better user experience** (integrated workflow)
- ✅ **Lower risk** (validate before full system)
- ✅ **Easy iteration** (rapid improvements)

**Recommendation**: Start with plugin, expand to full system if needed.

---

**Document Owner**: Engineering Leadership
**Last Updated**: 2025-11-05
**Next Review**: After Week 2 of development
