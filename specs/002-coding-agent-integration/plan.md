# Implementation Plan: Coding Agent Integration

**Branch**: `002-coding-agent-integration` | **Date**: 2025-11-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-coding-agent-integration/spec.md`

## Summary

Enable MT-PRISM to use existing coding agents (Claude Code, Cursor, GitHub Copilot, Codex) as LLM providers, eliminating the need for separate API keys. This extends the existing multi-provider abstraction to support agent-based providers with automatic detection, fallback capabilities, and per-skill overrides.

## Technical Context

**Language/Version**: TypeScript 5.3+, Node.js 20 LTS
**Primary Dependencies**: Existing LLM provider abstraction (`src/providers/`), dotenv, zod
**New Dependencies**: Agent-specific communication libraries (to be researched in Phase 0)
**Storage**: File-based configuration (.env, .prism/config.yaml)
**Testing**: Vitest (80%+ coverage), manual testing with each supported agent
**Target Platform**: Local development environments with coding agents installed
**Project Type**: Single project (extends existing src/ structure)
**Performance Goals**: Agent detection < 2s, no additional latency vs direct API
**Constraints**: Must work with existing LLMProvider interface, zero breaking changes
**Scale/Scope**: Support 4 coding agents (Claude Code, Cursor, Copilot, Codex)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Skill-First Architecture ✅
- **Compliance**: Agent integration extends existing provider abstraction, no new skills needed
- **Impact**: Enables skills to work seamlessly with coding agents
- **Validation**: All 5 existing skills (PRD Analyzer, Figma Analyzer, Validator, Clarification Manager, TDD Generator) will work with agent providers

### Principle II: Document-Driven Discovery ✅
- **Compliance**: Feature does not change document-driven workflow
- **Impact**: Agents analyze same PRDs/Figma files as API providers
- **Validation**: Input sources (Confluence, Figma, local files) remain unchanged

### Principle III: Test-First Development ✅
- **Compliance**: TDD mandatory - write tests for each agent provider before implementation
- **Impact**: Tests verify agent detection, communication, and fallback logic
- **Validation**: Target 80%+ coverage, test with mock agents and real environments

### Principle IV: Iterative Clarification ✅
- **Compliance**: Agent mode does not change clarification workflow
- **Impact**: Clarification Manager skill works identically with agents
- **Validation**: Q&A loops function regardless of provider type

### Principle V: Progressive Enhancement ✅
- **Compliance**: Agent support is additive, existing API-based usage unchanged
- **Impact**: Users can adopt agent mode incrementally
- **Validation**: Existing functionality remains 100% backward compatible

### Principle VI: Observable Operations ✅
- **Compliance**: Agent operations provide same progress reporting as API calls
- **Impact**: Users see which agent is being used, detection results, fallback events
- **Validation**: Console output shows agent selection and status updates

### Principle VII: MCP-Based Integration ✅
- **Compliance**: Agent integration does not affect MCP server usage
- **Impact**: MCPs (Confluence, Figma, Jira, Slack) work identically with agents
- **Validation**: MCP clients remain provider-agnostic

### Principle VIII: LLM Provider Abstraction ✅
- **Compliance**: Agents implement LLMProvider interface, no direct SDK calls
- **Impact**: Agents are first-class providers alongside Anthropic/OpenAI/Google
- **Validation**: Factory pattern extended to support agent providers

**Gate Status**: ✅ PASS - All 8 principles compliant, no violations to justify

## Project Structure

### Documentation (this feature)

```text
specs/002-coding-agent-integration/
├── spec.md                  # Feature specification ✅ Complete
├── plan.md                  # This file (in progress)
├── research.md              # Phase 0: Agent APIs and detection methods
├── data-model.md            # Phase 1: Agent configuration model
├── quickstart.md            # Phase 1: Agent mode setup guide
├── contracts/               # Phase 1: Agent provider interface contracts
│   └── agent-provider.ts    # TypeScript interface definitions
├── checklists/
│   └── requirements.md      # Quality checklist ✅ Complete
└── tasks.md                 # Phase 2: Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── providers/               # Existing multi-provider abstraction
│   ├── types.ts             # ✅ Exists - LLMProvider interface
│   ├── anthropic.ts         # ✅ Exists
│   ├── openai.ts            # ✅ Exists
│   ├── google.ts            # ✅ Exists
│   ├── agent.ts             # NEW - Agent provider implementation
│   ├── factory.ts           # MODIFY - Add agent to fallback chain
│   └── index.ts             # MODIFY - Export agent provider
├── utils/
│   ├── agent-detector.ts    # NEW - Detect available coding agents
│   └── agent-comm.ts        # NEW - Agent communication helpers
└── types/
    └── agent.ts             # NEW - Agent-specific types

tests/
├── unit/
│   └── providers/
│       ├── agent.test.ts           # NEW - Agent provider tests
│       └── agent-detector.test.ts  # NEW - Detection logic tests
└── integration/
    └── agent-integration.test.ts   # NEW - End-to-end agent tests
```

**Structure Decision**: Single project structure maintained. Agent support added as new provider type alongside existing Anthropic/OpenAI/Google providers. Extends `src/providers/` directory with agent-specific implementations.

## Complexity Tracking

*No violations - all constitution principles compliant.*

## Phase 0: Research & Resolution

### Research Tasks

1. **Claude Code Agent API**
   - Research how to programmatically interact with Claude Code from Node.js
   - Determine if Claude Code exposes stdin/stdout, HTTP API, or other protocol
   - Identify environment variables or processes that indicate Claude Code is running
   - Document prompt format and response parsing requirements

2. **Cursor Agent API**
   - Research Cursor's programmatic LLM access mechanisms
   - Determine detection method (environment variables, config files, processes)
   - Document how to send prompts and receive responses
   - Identify limitations (token limits, structured output support)

3. **GitHub Copilot API**
   - Research GitHub Copilot's programmatic access (if available)
   - Determine if Copilot CLI or VS Code extension provides API
   - Document detection methods and communication protocols
   - Identify constraints (authentication, rate limits)

4. **OpenAI Codex API**
   - Research Codex availability and access methods
   - Determine if Codex is separate from standard OpenAI API or deprecated
   - Document migration path if Codex is replaced by GPT-4

5. **Agent Detection Patterns**
   - Research reliable methods to detect coding agent presence
   - Environment variable patterns (`CLAUDE_CODE`, `CURSOR_SESSION`, etc.)
   - Process inspection approaches
   - Configuration file locations
   - API endpoint probing

6. **Structured Output Handling**
   - Research how each agent handles JSON/structured output requests
   - Determine if agents support Anthropic-style tool calling
   - Document fallback strategies for agents without native structured output
   - Identify parsing/validation approaches

**Output**: `research.md` with findings and technology decisions

## Phase 1: Design & Contracts

### Data Model (`data-model.md`)

**Entities**:

1. **AgentProvider**
   - name: string (claude-code, cursor, copilot, codex)
   - detection_method: function
   - capabilities: AgentCapabilities
   - communication_protocol: AgentProtocol

2. **AgentConfiguration**
   - selected_agent: string | 'auto'
   - fallback_enabled: boolean
   - per_skill_overrides: Map<SkillName, ProviderType>
   - detection_priority: string[]

3. **AgentDetectionResult**
   - available_agents: AgentProvider[]
   - selected_agent: AgentProvider | null
   - confidence: number
   - fallback_options: string[]

**Relationships**:
- AgentConfiguration references AgentProvider by name
- AgentDetectionResult contains discovered AgentProvider instances
- Factory creates appropriate provider based on AgentDetectionResult

### API Contracts (`contracts/`)

**agent-provider.ts** - Agent Provider Interface
```typescript
interface AgentProvider extends LLMProvider {
  detectAvailability(): Promise<boolean>;
  getCapabilities(): AgentCapabilities;
  estimateTokenLimit(): number;
}

interface AgentCapabilities {
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  maxTokens: number;
  supportsVision: boolean;
}

interface AgentProtocol {
  sendPrompt(prompt: string, options?: PromptOptions): Promise<string>;
  sendStructuredPrompt<T>(prompt: string, schema: ZodSchema<T>): Promise<T>;
  streamResponse(prompt: string): AsyncGenerator<string>;
}
```

**agent-detector.ts** - Detection Service
```typescript
interface AgentDetector {
  detectAll(): Promise<AgentDetectionResult>;
  detectSpecific(agentName: string): Promise<boolean>;
  getPriorityOrder(): string[];
  selectBest(available: AgentProvider[]): AgentProvider | null;
}
```

### Quickstart Guide (`quickstart.md`)

**Agent Mode Setup**:
1. Configure your coding agent (Claude Code, Cursor, etc.) - one-time setup
2. Set `AI_PROVIDER=agent` in `.env` or leave unset for auto-detection
3. Run MT-PRISM normally - it will use your coding agent
4. Optional: Configure fallback with API keys for reliability

### Agent Context Update

After Phase 1 design completion, run:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

This updates `.claude/` context files with new agent provider types and detection logic.

## Phase 2: Task Generation

*Created by `/speckit.tasks` command - not part of `/speckit.plan`*

Task generation will create dependency-ordered tasks for:
- Agent detection implementation
- Agent provider adapters (4 agents)
- Integration with existing factory
- Testing across all agents
- Documentation and examples

## Next Steps

1. ✅ Execute Phase 0: Research agent APIs
2. ✅ Execute Phase 1: Design data models and contracts
3. ⏭️ Run `/speckit.tasks` to generate implementation tasks
4. ⏭️ Run `/speckit.implement` to execute tasks

**Estimated Effort**: 2-3 days (research + implementation + testing across 4 agents)
