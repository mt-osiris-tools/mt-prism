# Research: Coding Agent Integration

**Date**: 2025-11-20
**Feature**: 002-coding-agent-integration
**Status**: Phase 0 Complete

## Executive Summary

Research into programmatic access to coding agents reveals that **true "zero API key" usage is not technically feasible** for standalone CLI tools. All coding agents ultimately require authentication:

- Claude Code requires `ANTHROPIC_API_KEY`
- Cursor requires API keys (routed through Cursor servers)
- GitHub Copilot requires PAT or OAuth
- Codex requires `OPENAI_API_KEY`

**Recommendation**: Reframe feature from "no API keys" to **"use agent-configured credentials"** - detect which agent the user has and automatically use the same provider configuration, reducing duplicate credential management.

## Research Findings

### 1. Claude Code

**Detection**: ✅ Feasible
- Check `process.env.TERM === 'not\na\ntty'` (unique identifier)
- No official `CLAUDE_CODE` env var (feature requested)

**Programmatic Access**: ✅ Full Support
- Use `@anthropic-ai/sdk` (already integrated in Phase 2)
- Same API key required: `ANTHROPIC_API_KEY`

**Structured Output**: ✅ Native Support (Beta Nov 2025)
- Beta header: `anthropic-beta: structured-outputs-2025-11-13`
- Zod integration supported
- Models: Sonnet 4.5, Opus 4.1

**Key Insight**: Claude Code IS the Anthropic API - no separate integration needed. Detection tells us user prefers Claude, but same API key required.

**Decision**: ✅ Support as environment detection only (no new provider implementation needed)

---

### 2. Cursor

**Detection**: ✅ Feasible
- Check for `.cursor/` directory in project root
- Check for `.cursor/rules/` or `.cursor/mcp/` config

**Programmatic Access**: ⚠️ Limited
- **No official public API** for direct access
- Unofficial package: `cursor-background-agent-api`
- Cursor routes through their servers before reaching LLM

**Structured Output**: Via underlying model
- Cursor uses Claude, GPT-4, or Gemini
- Structured output depends on selected model

**Key Insight**: Cannot directly call Cursor's AI without using unofficial APIs or Cursor's own routing.

**Decision**: ⚠️ **Defer support** - wait for official Cursor API or use existing provider abstraction (users configure which model Cursor uses)

**Alternative**: Detect Cursor environment and guide users to configure the underlying provider (Claude/GPT-4) directly

---

### 3. GitHub Copilot

**Detection**: ✅ Feasible
- VS Code: Check for `GitHub.copilot` extension
- CLI: Check `gh extension list | grep copilot`

**Programmatic Access**: ⚠️ Extension-Only
- **Official**: VS Code Extension API (`vscode.lm.selectChatModels`)
- **Unofficial**: `copilot-api` package (OpenAI-compatible proxy)
- Requires running as VS Code extension (not standalone CLI)

**Structured Output**: Via GPT-4o
- Use OpenAI's native structured output
- Requires extension API access

**Key Insight**: GitHub Copilot authentication is handled by VS Code extension. Cannot access programmatically from standalone Node.js CLI without user's GitHub PAT.

**Decision**: ⚠️ **Defer support** - requires VS Code extension architecture (out of scope for CLI tool)

**Alternative**: Detect Copilot environment and guide users to configure `OPENAI_API_KEY` (same models available)

---

### 4. OpenAI Codex

**Detection**: ✅ Feasible
- Check for `CODEX_SESSION` or `CHATGPT_API_KEY` env vars
- Check for Codex CLI installation

**Programmatic Access**: ✅ Full Support
- Use `openai` SDK (already integrated in Phase 2)
- Available as GPT-5-Codex (Oct 2025)
- Same `OPENAI_API_KEY` required

**Structured Output**: ✅ Native Support
- `openai.beta.chat.completions.parse()`
- Zod integration via `zodResponseFormat()`

**Key Insight**: Codex is now just a branding for OpenAI models accessed through standard API. No separate integration needed.

**Decision**: ✅ Support as environment detection only (no new provider implementation needed)

---

## Key Decisions

### Decision 1: Reframe Feature Scope

**Original Intent**: "Use coding agents without API keys"

**Technical Reality**: All agents ultimately require API authentication

**Revised Approach**: **"Smart Provider Selection Based on Environment"**
- Detect which coding agent user has configured
- Automatically use the matching API provider
- Reduce duplicate credential management
- Provide better defaults and error messages

**Benefits**:
- Maintains original user value (simpler setup)
- Technically feasible with existing infrastructure
- No unofficial/unsupported APIs needed
- Works with current LLMProvider abstraction

---

### Decision 2: Supported Agents

| Agent | Support Level | Implementation |
|-------|---------------|----------------|
| **Claude Code** | ✅ Full | Environment detection → use existing Anthropic provider |
| **Cursor** | ⚠️ Partial | Environment detection → guide to underlying provider config |
| **GitHub Copilot** | ⚠️ Partial | Environment detection → guide to OpenAI configuration |
| **Codex** | ✅ Full | Environment detection → use existing OpenAI provider |

**Rationale**:
- Focus on agents with official APIs (Claude Code, Codex)
- Provide guidance for agents without APIs (Cursor, Copilot)
- Avoid unofficial/unsupported integrations
- Maintain zero-infrastructure principle

---

### Decision 3: Agent Detection Strategy

**Approach**: Multi-signal detection with priority order

**Detection Methods**:
1. Environment variables (`TERM`, `CODEX_SESSION`, etc.)
2. Project configuration files (`.cursor/`, `.vscode/`)
3. Process inspection (parent process names)
4. User preference in `.env` (`PREFERRED_AGENT=claude-code`)

**Priority Order** (auto-detection):
1. Explicit user preference (`AI_PROVIDER=agent:claude-code`)
2. Claude Code (if detected via TERM check)
3. Codex (if CODEX_SESSION exists)
4. Cursor (if `.cursor/` exists) → guide to config
5. Copilot (if extension detected) → guide to config
6. Fallback to configured API provider

**Benefits**:
- Respects user choice when explicit
- Provides smart defaults when not specified
- Clear error messages when no provider available

---

### Decision 4: Backward Compatibility

**Requirement**: Zero breaking changes to existing functionality

**Implementation**:
- Agent detection is opt-in (via `AI_PROVIDER=agent` or auto-detection when no API keys)
- Existing API-based usage unchanged
- Factory pattern extended, not replaced
- All existing tests continue to pass

**Validation**:
- Run full test suite after implementation
- Verify existing workflows function identically
- Document migration path for users

---

## Resolved Unknowns

### Agent Communication Libraries

**Decision**: **No additional dependencies needed**
- Claude Code: Use existing `@anthropic-ai/sdk`
- Codex: Use existing `openai` SDK
- Cursor/Copilot: Detection only, guide to provider config

**Rationale**: Leverages existing Phase 2 infrastructure, maintains zero-infrastructure principle

### Structured Output Handling

**Decision**: Use existing schema validation approach
- Agents use same prompt templates as API providers
- Schema validation via existing Zod schemas
- No agent-specific parsing logic needed

**Implementation**: Existing `generateStructured()` method works for all agents

### Agent Detection Performance

**Decision**: Lazy detection with caching
- Run detection once on first provider creation
- Cache result in process memory
- Re-detect only if explicitly requested
- Target: < 500ms detection time

**Implementation**:
```typescript
let cachedDetection: AgentDetectionResult | null = null;

async function detectAgent(): Promise<AgentDetectionResult> {
  if (cachedDetection) return cachedDetection;

  // Run detection logic
  cachedDetection = await performDetection();
  return cachedDetection;
}
```

---

## Phase 0 Completion

**All NEEDS CLARIFICATION items resolved**:
- ✅ Agent communication protocols identified
- ✅ Detection methods determined
- ✅ Structured output approach confirmed
- ✅ Authentication requirements understood
- ✅ Scope refined based on technical feasibility

**Key Architectural Decision**:
Shift from "no API keys" to "environment-aware provider selection" - technically feasible, maintains user value, leverages existing infrastructure.

**Ready for Phase 1**: Data model and contract design
