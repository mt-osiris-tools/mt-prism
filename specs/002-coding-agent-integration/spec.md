# Feature Specification: Coding Agent Integration

**Feature Branch**: `002-coding-agent-integration`
**Created**: 2025-11-20
**Status**: Draft
**Input**: User description: "Add also a coding agent aproach to be used with claude code, open code, codex, or github copilot, this should work as an alternative to add specific api keys, we should support these agents once the user has been configurated in his local environments"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use Coding Agent Without API Keys (Priority: P1)

Developers who already use coding assistants (Claude Code, Cursor, GitHub Copilot, etc.) want to use MT-PRISM without managing separate API keys. They prefer to leverage their existing agent configuration rather than duplicating credentials.

**Why this priority**: This is the primary use case - developers already have coding agents configured and don't want the friction of managing additional API keys. This removes a major adoption barrier.

**Independent Test**: Can be fully tested by running PRD analysis with `AI_PROVIDER=agent` (no API keys configured) and verifying it delegates LLM calls to the configured coding agent. Delivers immediate value by enabling zero-setup usage.

**Acceptance Scenarios**:

1. **Given** a developer has Claude Code configured in their environment, **When** they set `AI_PROVIDER=agent` and run PRD analysis, **Then** the system delegates all LLM calls to Claude Code and completes successfully
2. **Given** a developer has Cursor configured, **When** they use MT-PRISM with agent mode, **Then** prompts are sent to Cursor's AI and requirements are extracted
3. **Given** a developer has no coding agent configured, **When** they try to use agent mode, **Then** the system shows a clear error message explaining agent mode requires a configured coding assistant
4. **Given** agent mode is active, **When** analysis requires structured output, **Then** the system properly formats prompts and parses responses from the agent

---

### User Story 2 - Seamless Agent Detection (Priority: P2)

Developers want MT-PRISM to automatically detect which coding agent is available rather than manually configuring it.

**Why this priority**: Reduces configuration burden and prevents errors from misconfiguration. Makes the tool "just work" in any supported environment.

**Independent Test**: Can be tested by running MT-PRISM in different environments (Claude Code, Cursor, VS Code with Copilot) without any configuration and verifying correct agent detection.

**Acceptance Scenarios**:

1. **Given** Claude Code is running in the current environment, **When** user runs MT-PRISM without specifying `AI_PROVIDER`, **Then** system auto-detects Claude Code and uses it
2. **Given** multiple coding agents are available, **When** auto-detection runs, **Then** system selects based on priority order (Claude Code > Cursor > Copilot) and notifies user
3. **Given** no coding agent is detected, **When** no API keys are configured, **Then** system provides clear instructions for either setup option

---

### User Story 3 - Mixed Mode Operation (Priority: P3)

Developers want the flexibility to use different providers for different skills (e.g., agent for PRD analysis, direct API for TDD generation).

**Why this priority**: Provides advanced users with optimization options - they can use free agent tier for simple tasks and direct API for complex tasks requiring specific models.

**Independent Test**: Configure selective provider overrides and verify each skill uses the specified provider correctly.

**Acceptance Scenarios**:

1. **Given** user configures `DEFAULT_PROVIDER=agent` and `TDD_GENERATOR_PROVIDER=anthropic`, **When** running full workflow, **Then** PRD/Figma analysis uses agent and TDD generation uses Anthropic API
2. **Given** agent mode is default, **When** agent fails or is unavailable, **Then** system falls back to configured API providers

---

### Edge Cases

- What happens when coding agent is configured but not running/available?
- How does system handle agents that don't support structured output?
- What if agent has token limits different from API providers?
- How to handle agent-specific prompt length limits?
- What if user switches between environments (Claude Code → Cursor)?
- How to handle agents with different response formats?
- What if agent configuration changes mid-workflow?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-060**: System MUST support using configured coding agents (Claude Code, Cursor, GitHub Copilot, etc.) as LLM providers without requiring direct API keys
- **FR-061**: System MUST provide `agent` as a valid option for `AI_PROVIDER` environment variable
- **FR-062**: System MUST detect which coding agent is available in the current environment
- **FR-063**: System MUST delegate LLM calls to the detected coding agent using agent-specific communication protocols
- **FR-064**: System MUST support all MT-PRISM functionality (requirements extraction, classification, ambiguity detection, structured output) when using agent mode
- **FR-065**: System MUST format prompts appropriately for coding agents that may have different input expectations than direct API calls
- **FR-066**: System MUST parse and validate responses from coding agents to ensure they meet schema requirements
- **FR-067**: System MUST provide clear error messages when agent mode is selected but no coding agent is configured or available
- **FR-068**: System MUST support automatic agent detection with configurable priority order (default: Claude Code > Cursor > Copilot > GitHub Copilot Chat)
- **FR-069**: System MUST allow users to explicitly specify which agent to use via configuration
- **FR-070**: System MUST fall back to direct API providers if agent is unavailable (when API keys are configured)
- **FR-071**: System MUST notify users when fallback from agent to API occurs
- **FR-072**: System MUST support per-skill provider overrides (e.g., use agent for analysis, API for generation)
- **FR-073**: System MUST handle agent-specific limitations (token limits, timeout differences, rate limiting)
- **FR-074**: System MUST validate that the detected agent supports required capabilities before using it

### Key Entities

- **AgentProvider**: Represents a coding agent integration (name, detection method, capabilities, communication protocol)
- **AgentConfiguration**: User configuration for agent mode (selected agent, fallback behavior, per-skill overrides, detection priority)
- **AgentDetectionResult**: Result of agent detection (available agents, selected agent, confidence, fallback options)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-017**: Users can run MT-PRISM skills with zero configuration when a supported coding agent is already set up in their environment
- **SC-018**: Agent mode successfully completes PRD analysis with same accuracy (95%+) as direct API providers
- **SC-019**: Agent detection correctly identifies available coding agent in 100% of supported environments
- **SC-020**: Users receive clear guidance within 3 seconds when agent mode is requested but no agent is available
- **SC-021**: System transitions between agent and API providers without user intervention when configured for fallback
- **SC-022**: Documentation enables 90% of users to set up agent mode successfully on first attempt

## Assumptions *(mandatory)*

- Coding agents provide programmatic access to their LLM capabilities through documented APIs or protocols
- Supported agents (Claude Code, Cursor, Copilot) expose methods for sending prompts and receiving responses
- Agent environments can be detected through environment variables, process inspection, or API availability
- Users running MT-PRISM have already configured their preferred coding agent separately
- Agent response formats can be parsed and validated against MT-PRISM schemas
- Agents support prompts up to at least 8K tokens (sufficient for PRD analysis prompts)
- Detection mechanisms are reliable and don't create significant startup latency

## Dependencies *(include if feature relies on other work)*

- Depends on existing multi-provider LLM abstraction (Phase 2, Constitutional Principle VIII)
- Extends `LLMProvider` interface to support agent-based providers
- Uses existing prompt template system (`src/utils/prompts.ts`)
- Uses existing schema validation (`src/schemas/`)
- May require agent-specific SDKs or communication libraries
- Documentation on each supported agent's programmatic API access

## Constraints *(include if there are limitations)*

- Agent availability limited to environments where supported coding assistants are installed and configured
- Agent capabilities vary (some may not support structured output natively)
- Agent response times may differ from direct API calls (could be faster or slower)
- Agent token limits may differ from API provider limits
- Cannot use agent mode in headless/CI environments unless agent provides non-interactive API
- Agent detection must not introduce significant startup delay (< 2 seconds)

## Out of Scope *(include to clarify what's NOT included)*

- Installing or configuring coding agents (users must do this separately)
- Supporting coding agents beyond the four specified (Claude Code, Cursor, Codex, GitHub Copilot)
- Creating wrappers or abstractions over agent-specific features
- Managing agent subscriptions or billing
- Providing fallback behavior if no API keys AND no agent are configured (this remains an error)
- Supporting agents in non-standard configurations or custom setups

## Security & Privacy Considerations *(include if feature handles sensitive data)*

- Agent mode delegates all prompts to locally-configured coding agents
- PRD content sent to agents follows same privacy model as direct API usage
- Users' agent configurations and credentials remain under their control
- No additional data collection or transmission beyond normal agent usage
- Agent communication must not expose MT-PRISM internal state or session data beyond the prompt content
- Users should understand that agent providers may have different data retention policies than direct API providers

## Open Questions

None - all critical decisions have reasonable defaults documented in Assumptions section.
