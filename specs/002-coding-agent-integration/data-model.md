# Data Model: Coding Agent Integration

**Feature**: 002-coding-agent-integration
**Phase**: 1 (Design)
**Date**: 2025-11-20

## Overview

Data structures for environment-aware provider selection based on detected coding agents.

## Entity Definitions

### 1. AgentDetectionResult

Represents the result of detecting available coding agents in the current environment.

**Attributes**:
- `detectedAgent`: string | null - Name of detected agent ('claude-code', 'codex', 'cursor', 'copilot', null)
- `confidence`: number - Confidence in detection (0.0-1.0)
- `detectionMethod`: string - How agent was detected ('env-var', 'config-file', 'process', 'explicit')
- `recommendedProvider`: string - Suggested provider based on agent ('anthropic', 'openai', null)
- `detectedAt`: string - ISO 8601 timestamp
- `fallbackAvailable`: boolean - Whether API providers are configured as fallback

**Validation Rules**:
- detectedAgent must be one of: 'claude-code', 'codex', 'cursor', 'copilot', null
- confidence must be between 0.0 and 1.0
- If detectedAgent is not null, recommendedProvider must not be null
- detectedAt must be valid ISO 8601 datetime

**Example**:
```typescript
{
  detectedAgent: 'claude-code',
  confidence: 0.95,
  detectionMethod: 'env-var',
  recommendedProvider: 'anthropic',
  detectedAt: '2025-11-20T12:00:00Z',
  fallbackAvailable: true
}
```

---

### 2. AgentConfiguration

User preferences for agent-based provider selection.

**Attributes**:
- `mode`: 'auto' | 'explicit' | 'disabled' - Detection mode
- `preferredAgent`: string | null - User's preferred agent (overrides auto-detection)
- `enableFallback`: boolean - Allow fallback to API providers
- `detectionPriority`: string[] - Custom priority order for auto-detection
- `perSkillOverrides`: Record<string, string> - Provider overrides per skill

**Validation Rules**:
- mode must be one of: 'auto', 'explicit', 'disabled'
- If mode is 'explicit', preferredAgent must not be null
- detectionPriority array must contain valid agent names
- perSkillOverrides values must be valid provider names

**Default Values**:
```typescript
{
  mode: 'auto',
  preferredAgent: null,
  enableFallback: true,
  detectionPriority: ['claude-code', 'codex', 'cursor', 'copilot'],
  perSkillOverrides: {}
}
```

**Example**:
```typescript
{
  mode: 'explicit',
  preferredAgent: 'claude-code',
  enableFallback: true,
  detectionPriority: ['claude-code', 'codex'],
  perSkillOverrides: {
    'tdd-generator': 'anthropic' // Use direct API for TDD generation
  }
}
```

---

### 3. ProviderSelectionResult

Final result of provider selection combining agent detection and configuration.

**Attributes**:
- `selectedProvider`: string - Final provider to use ('anthropic', 'openai', 'google')
- `source`: 'agent-detection' | 'api-configured' | 'default' - How provider was selected
- `agentContext`: AgentDetectionResult | null - Detection result if agent-based
- `rationale`: string - Explanation of selection
- `warnings`: string[] - Any warnings or issues

**Validation Rules**:
- selectedProvider must be valid provider name
- If source is 'agent-detection', agentContext must not be null
- rationale must be non-empty string

**Example**:
```typescript
{
  selectedProvider: 'anthropic',
  source: 'agent-detection',
  agentContext: {
    detectedAgent: 'claude-code',
    confidence: 0.95,
    detectionMethod: 'env-var',
    recommendedProvider: 'anthropic',
    detectedAt: '2025-11-20T12:00:00Z',
    fallbackAvailable: true
  },
  rationale: 'Detected Claude Code environment, using Anthropic provider',
  warnings: []
}
```

---

## Relationships

```
AgentConfiguration
    ↓ (input to)
AgentDetector.detectAll()
    ↓ (produces)
AgentDetectionResult
    ↓ (input to)
ProviderFactory.selectProvider()
    ↓ (produces)
ProviderSelectionResult
    ↓ (contains)
LLMProvider (anthropic, openai, or google)
```

## State Transitions

### Agent Detection Lifecycle

```
UNDETECTED
    ↓ (on first provider creation)
DETECTING
    ↓ (agent found)
DETECTED → cache result
    ↓ (or agent not found)
NOT_DETECTED → fallback to API providers
    ↓ (or no fallback available)
ERROR → show configuration instructions
```

### Provider Selection Flow

```
1. Check explicit configuration (AI_PROVIDER=anthropic)
   ✓ Use configured provider

2. No explicit config → Run agent detection
   ✓ Agent found → Use recommended provider for that agent
   ✗ Agent not found → Check API keys

3. API keys configured → Use first available
   ✓ Has API key → Use that provider
   ✗ No API keys → ERROR (no provider available)
```

## Configuration Schema

### .env Configuration

```bash
# Agent Mode Configuration
AI_PROVIDER=auto              # auto | agent | anthropic | openai | google
AGENT_MODE=auto               # auto | explicit | disabled
PREFERRED_AGENT=claude-code   # Optional: override auto-detection

# Fallback Configuration
ENABLE_AGENT_FALLBACK=true    # Fall back to API if agent unavailable

# Per-Skill Overrides (optional)
PRD_ANALYZER_PROVIDER=agent
TDD_GENERATOR_PROVIDER=anthropic
```

### .prism/config.yaml Configuration

```yaml
agent:
  mode: auto
  preferred_agent: null
  enable_fallback: true
  detection_priority:
    - claude-code
    - codex
    - cursor
    - copilot
  per_skill_overrides:
    tdd-generator: anthropic
```

## Implementation Notes

### No New Provider Implementation Needed

**Key Finding**: Claude Code and Codex are just different environments for the same APIs we already support (Anthropic and OpenAI).

**Implication**: Agent "support" is primarily about:
1. **Detection**: Identify which agent environment we're in
2. **Selection**: Choose matching provider automatically
3. **UX**: Provide better error messages and guidance

**No New Code**: Extends factory logic, doesn't add new provider implementations

### Simplified Architecture

```typescript
// Existing (Phase 2)
createLLMProvider() → tries Anthropic → OpenAI → Google

// With Agent Detection (Phase 3)
createLLMProvider() → detectAgent() → recommend provider → try recommended → fallback chain
```

**Benefit**: Minimal code changes, leverages existing tested infrastructure

## Phase 1 Completion

All design artifacts ready for implementation:
- ✅ Entity definitions (3 entities)
- ✅ Validation rules documented
- ✅ State transitions defined
- ✅ Configuration schema specified
- ✅ Relationships mapped
- ✅ Implementation approach simplified

**Key Simplification**: Feature is primarily a smart detection + selection layer, not new provider implementations.

**Ready for**: Contract definition and quickstart guide
