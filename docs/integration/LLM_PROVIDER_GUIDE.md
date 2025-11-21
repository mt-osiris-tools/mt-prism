# LLM Provider Configuration Guide

This guide explains how MT-PRISM supports multiple AI providers and how to configure them.

## Supported Providers

MT-PRISM supports three major AI providers:

| Provider | Models | Recommended Use | Cost/1M Tokens |
|----------|--------|-----------------|----------------|
| **Anthropic** | Claude Sonnet 4.5, Opus, Haiku | Best overall quality, strong reasoning | $15 (in) / $75 (out) |
| **OpenAI** | GPT-4, GPT-4 Turbo | Good balance of speed and quality | $10 (in) / $30 (out) |
| **Google** | Gemini Pro, Ultra | Most cost-effective, fast responses | $7 (in) / $21 (out) |

## Quick Start

### 1. Choose Your Provider

Select based on your priorities:
- **Quality First**: Use Anthropic Claude Sonnet 4.5
- **Cost First**: Use Google Gemini Pro
- **Speed First**: Use OpenAI GPT-4 Turbo

### 2. Get API Key

#### Anthropic (Claude)
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create new key
5. Copy the key (starts with `sk-ant-`)

#### OpenAI (GPT-4)
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create new secret key
5. Copy the key (starts with `sk-`)

#### Google (Gemini)
1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Sign up or log in
3. Get API Key
4. Copy the key

### 3. Configure Environment

Create `.env` file:

```bash
# Primary provider (required)
AI_PROVIDER=anthropic  # Options: anthropic, openai, google

# Provider API keys (add all you plan to use)
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx

# Optional: Specific model selection
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
OPENAI_MODEL=gpt-4-turbo
GOOGLE_MODEL=gemini-pro
```

## LLM Abstraction Layer

MT-PRISM uses an abstraction layer to provide a unified interface across all AI providers.

### Architecture

```typescript
┌─────────────────────────────────────┐
│      MT-PRISM Skills                │
│  (PRD Analyzer, Figma Analyzer...)  │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│    LLM Abstraction Interface        │
│  - generateText(prompt, options)    │
│  - streamText(prompt, options)      │
│  - generateStructured(schema)       │
└─────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│Anthropic│  │OpenAI │  │ Google │
│Provider │  │Provider│  │Provider│
└────────┘  └────────┘  └────────┘
```

### Provider Interface

All providers implement this common interface:

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

interface GenerateOptions {
  temperature?: number      // 0-1, creativity level
  maxTokens?: number       // Max output length
  stopSequences?: string[] // Stop generation at these
  topP?: number           // Nucleus sampling
  model?: string          // Override default model
}

interface ProviderInfo {
  name: string
  defaultModel: string
  supportedModels: string[]
  maxTokens: number
  costPer1MInput: number
  costPer1MOutput: number
}
```

## Configuration Examples

### Example 1: Single Provider (Simplest)

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

```typescript
// Code automatically uses Anthropic
const llm = createLLMProvider()
const result = await llm.generateText("Extract requirements from this PRD...")
```

### Example 2: Multiple Providers with Fallback

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx  # Fallback if Anthropic fails
```

```typescript
// Configure fallback chain
const config = {
  primary: 'anthropic',
  fallback: ['openai']
}

const llm = createLLMProvider(config)
// Tries Anthropic first, falls back to OpenAI if rate limited
```

### Example 3: Task-Specific Providers

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx
```

```typescript
// Use different providers for different tasks
const config = {
  prdAnalyzer: 'anthropic',    // Best quality for complex analysis
  figmaAnalyzer: 'openai',     // Good balance for structured data
  validator: 'google',          // Cost-effective for simpler task
  tddGenerator: 'anthropic'    // Best quality for comprehensive docs
}
```

## Model Selection

### Anthropic Models

```bash
# Recommended for production
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# For maximum quality (higher cost)
ANTHROPIC_MODEL=claude-opus-4-20250514

# For speed/cost optimization
ANTHROPIC_MODEL=claude-haiku-3-5-20250219
```

### OpenAI Models

```bash
# Recommended for production
OPENAI_MODEL=gpt-4-turbo

# For maximum quality
OPENAI_MODEL=gpt-4

# For cost optimization
OPENAI_MODEL=gpt-4-turbo-preview
```

### Google Models

```bash
# Recommended for production
GOOGLE_MODEL=gemini-pro

# For maximum quality (when available)
GOOGLE_MODEL=gemini-ultra

# For fastest responses
GOOGLE_MODEL=gemini-pro-flash
```

## Cost Optimization

### Strategy 1: Provider Selection by Task

Use expensive models only for complex tasks:

```typescript
const costOptimizedConfig = {
  // Complex reasoning tasks
  prdAnalyzer: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  tddGenerator: { provider: 'anthropic', model: 'claude-sonnet-4-5' },

  // Structured extraction tasks
  figmaAnalyzer: { provider: 'openai', model: 'gpt-4-turbo' },

  // Validation and simple tasks
  validator: { provider: 'google', model: 'gemini-pro' },
  clarificationManager: { provider: 'google', model: 'gemini-pro' }
}
```

**Savings**: ~30-40% vs using top-tier model for everything

### Strategy 2: Caching

Enable caching for repeated analyses:

```typescript
const config = {
  enableCache: true,
  cacheTTL: 3600, // 1 hour
  cacheKey: (prompt) => hashPrompt(prompt)
}
```

**Savings**: ~50-70% on repeated operations

### Strategy 3: Prompt Optimization

Reduce token usage with concise prompts:

```typescript
// Instead of verbose instructions
const verbosePrompt = `
  Please analyze this PRD and extract all requirements.
  For each requirement, provide detailed information including...
  [500 tokens of instructions]
`

// Use structured, concise instructions
const optimizedPrompt = `
  Extract requirements from PRD. Output YAML with:
  - id, type, priority, description, acceptance_criteria
  [100 tokens]
`
```

**Savings**: ~20-30% on input tokens

## Error Handling

### Rate Limits

```typescript
const config = {
  retryOnRateLimit: true,
  maxRetries: 3,
  retryDelay: 1000, // ms
  exponentialBackoff: true
}
```

### Provider Failures

```typescript
const config = {
  fallbackOnError: true,
  fallbackProviders: ['openai', 'google'],
  timeoutMs: 30000
}
```

### Cost Limits

```typescript
const config = {
  maxCostPerWorkflow: 5.00, // USD
  warnThreshold: 4.00,
  onCostExceeded: (cost) => {
    console.warn(`Cost limit exceeded: $${cost}`)
  }
}
```

## Monitoring

### Token Usage Tracking

```typescript
import { trackTokenUsage } from '@mt-prism/core'

const stats = trackTokenUsage()
console.log({
  inputTokens: stats.input,
  outputTokens: stats.output,
  totalCost: stats.cost,
  provider: stats.provider
})
```

### Performance Metrics

```typescript
import { getMetrics } from '@mt-prism/core'

const metrics = getMetrics()
console.log({
  avgLatency: metrics.avgLatency,
  successRate: metrics.successRate,
  costPerWorkflow: metrics.avgCost,
  providerBreakdown: metrics.byProvider
})
```

## Best Practices

### 1. Development vs Production

```bash
# .env.development
AI_PROVIDER=google
GOOGLE_API_KEY=xxxxx  # Cheapest for testing

# .env.production
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=xxxxx  # Best quality for production
```

### 2. Graceful Degradation

```typescript
const config = {
  qualityTiers: [
    { provider: 'anthropic', model: 'claude-sonnet-4-5' },
    { provider: 'openai', model: 'gpt-4-turbo' },
    { provider: 'google', model: 'gemini-pro' }
  ],
  fallbackOnQuality: true
}
```

### 3. Cost Budgeting

```typescript
const dailyBudget = {
  maxDailyCost: 50.00,
  alertThreshold: 40.00,
  providers: {
    anthropic: 30.00,
    openai: 15.00,
    google: 5.00
  }
}
```

## Troubleshooting

### Issue: "Provider not found"

```bash
# Solution: Install provider SDK
npm install @anthropic-ai/sdk
# or
npm install openai
# or
npm install @google/generative-ai
```

### Issue: "Invalid API key"

```bash
# Solution: Check key format and expiration
# Anthropic: starts with sk-ant-
# OpenAI: starts with sk-
# Google: alphanumeric string
```

### Issue: "Rate limit exceeded"

```bash
# Solution: Enable retry with backoff
AI_RETRY_ON_RATE_LIMIT=true
AI_MAX_RETRIES=5
AI_RETRY_DELAY=2000
```

### Issue: "High costs"

```bash
# Solution: Switch to cheaper provider or enable caching
AI_PROVIDER=google  # Switch to Gemini
AI_ENABLE_CACHE=true
AI_CACHE_TTL=7200
```

## Migration Guide

### From Claude-Only to Multi-Provider

1. **Install additional SDKs**:
```bash
npm install openai @google/generative-ai
```

2. **Update environment**:
```bash
# Add to .env
AI_PROVIDER=anthropic  # Keep current behavior
OPENAI_API_KEY=xxxxx   # Optional: for fallback
```

3. **Code changes**: None required! The abstraction layer handles everything.

4. **Test fallback**:
```bash
# Temporarily set invalid Anthropic key to test fallback
ANTHROPIC_API_KEY=invalid
AI_FALLBACK_PROVIDER=openai
```

## Advanced Configuration

### Custom Provider Implementation

```typescript
import { LLMProvider, registerProvider } from '@mt-prism/core'

class CustomProvider implements LLMProvider {
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    // Your implementation
  }

  // ... implement other methods
}

registerProvider('custom', CustomProvider)
```

### Provider-Specific Options

```typescript
const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 4096,
    temperature: 0.7
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organization: 'org-xxxxx',
    maxTokens: 4096
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    safetySettings: 'high'
  }
}
```

## Support

For issues or questions:
- **GitHub Issues**: [mt-prism/issues](https://github.com/your-org/mt-prism/issues)
- **Discussions**: [mt-prism/discussions](https://github.com/your-org/mt-prism/discussions)
- **Provider Docs**:
  - [Anthropic](https://docs.anthropic.com/)
  - [OpenAI](https://platform.openai.com/docs/)
  - [Google AI](https://ai.google.dev/docs)
