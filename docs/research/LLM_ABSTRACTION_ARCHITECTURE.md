# LLM Provider Abstraction Layer Design
## Research Report: Multi-Provider AI Systems Architecture

**Date**: 2025-11-20
**Status**: Research Complete
**Target Use**: MT-PRISM Plugin Architecture
**Scope**: Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google)

---

## 1. Recommended Architecture

### Design Pattern: Adapter Pattern with Factory

The recommended architecture uses the **Adapter pattern** combined with a **Factory pattern** to provide a unified interface across multiple AI providers while maintaining provider-specific optimizations.

#### Core Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                  MT-PRISM Skills Layer                    │
│  (PRD Analyzer, Figma Analyzer, Validator, TDD Gen...)   │
└──────────────────────────────┬───────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────┐
│         LLM Abstraction Interface (Unified)              │
│                                                           │
│  - generateText(prompt, options): Promise<string>        │
│  - streamText(prompt, options): AsyncGenerator<string>   │
│  - generateStructured<T>(prompt, schema): Promise<T>     │
│  - estimateCost(tokens): number                          │
│  - getInfo(): ProviderInfo                               │
└──────────────────────────────┬───────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Anthropic Adapter │  │  OpenAI Adapter   │  │ Google Adapter   │
│                  │  │                   │  │                  │
│ • Claude Sonnet  │  │ • GPT-4 Turbo    │  │ • Gemini Pro     │
│ • Claude Opus    │  │ • GPT-4          │  │ • Gemini Ultra   │
│ • Claude Haiku   │  │                   │  │                  │
│                  │  │ Features:         │  │ Features:        │
│ Features:        │  │ - Function calls  │  │ - Schema mode    │
│ - Tool use       │  │ - Vision support  │  │ - Embeddings API │
│ - Vision support │  │ - Rate limiting   │  │ - Streaming      │
│ - Streaming      │  │ - Cost tracking   │  │                  │
│ - Batch API      │  │                   │  │ Optimization:    │
│                  │  │ Optimization:     │  │ - Cost first     │
│ Optimization:    │  │ - Balance         │  │ - Speed second   │
│ - Quality first  │  │ - Versatility     │  │ - Quality third  │
│ - Batch for $    │  │                   │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
        ┌──────────────────────▼──────────────────────┐
        │    Provider APIs (HTTP/REST)               │
        │ (Never called directly by skills)          │
        └───────────────────────────────────────────┘
```

### Core TypeScript Interface Definition

```typescript
// Unified interface for all providers
interface LLMProvider {
  // Text generation - standard completion
  generateText(
    prompt: string,
    options?: GenerateOptions
  ): Promise<string>

  // Streaming text generation - for long outputs
  streamText(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string>

  // Structured output - validated against schema
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: StructuredOptions
  ): Promise<T>

  // Provider metadata
  getInfo(): ProviderInfo

  // Cost estimation for token usage
  estimateCost(input: number, output: number): number
}

interface GenerateOptions {
  temperature?: number           // 0-1, creativity (default: 0.7)
  maxTokens?: number            // Max output length
  stopSequences?: string[]      // Stop generation at these
  topP?: number                 // Nucleus sampling (0-1)
  topK?: number                 // Top-K sampling
  model?: string                // Override default model
  timeout?: number              // Request timeout in ms
  retryCount?: number           // Auto-retry on failure
}

interface StructuredOptions extends GenerateOptions {
  schemaName?: string           // For logging/debugging
  allowPartial?: boolean        // Allow partial object validation
  strict?: boolean              // Enforce strict schema validation
}

interface ProviderInfo {
  name: string                  // "anthropic", "openai", "google"
  displayName: string           // "Anthropic Claude", etc.
  defaultModel: string          // Default model for provider
  supportedModels: string[]     // All available models
  maxContextWindow: number      // Tokens
  maxOutputTokens: number       // Max tokens per request
  costPer1MInputTokens: number  // In USD
  costPer1MOutputTokens: number // In USD
  supportsStreaming: boolean
  supportsVision: boolean
  supportsToolUse: boolean
  supportsJsonMode: boolean
  rateLimit?: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}

// Factory function to create provider instance
function createLLMProvider(
  config?: LLMConfig
): Promise<LLMProvider>

interface LLMConfig {
  provider?: 'anthropic' | 'openai' | 'google'  // Primary provider
  apiKey?: string                                 // Override env var
  model?: string                                  // Override default
  fallbacks?: Array<{                            // Fallback providers
    provider: string
    apiKey?: string
    model?: string
  }>
  enableCaching?: boolean
  cacheTTL?: number                              // Seconds
  maxRetries?: number
  retryDelay?: number
  costLimit?: number                             // Per workflow
  onCostExceeded?: (cost: number) => void
}
```

---

## 2. Provider Comparison

### Structured Output Support

Each provider handles structured output differently. Here's how to leverage each:

#### Anthropic Claude

**Native Support**: Tool Use (JSON)

```typescript
// Anthropic's approach: tool definitions
const tools = [
  {
    name: "extract_requirements",
    description: "Extract requirements from PRD",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        description: { type: "string" },
        priority: { enum: ["critical", "high", "medium", "low"] }
      },
      required: ["id", "description"]
    }
  }
]

// Implementation
async generateStructured<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options?: StructuredOptions
): Promise<T> {
  const toolDef = zodToAnthropicTool(schema)

  const response = await this.client.messages.create({
    model: this.config.model,
    max_tokens: options?.maxTokens || 4096,
    tools: [toolDef],
    messages: [{ role: "user", content: prompt }]
  })

  // Extract tool use block
  const toolUse = response.content.find(
    (block) => block.type === "tool_use"
  )

  return schema.parse(JSON.parse(toolUse.input))
}
```

**Advantages**:
- Native tool use with explicit schema definition
- Tool results can be fed back to model for iteration
- Better control over generation process
- Excellent at complex structured outputs

**Best For**: Complex requirements extraction, multi-step analysis

#### OpenAI GPT-4

**Native Support**: JSON Mode + Function Calling

```typescript
// OpenAI's approach: JSON mode + system prompt
async generateStructured<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options?: StructuredOptions
): Promise<T> {
  const jsonSchema = zodToJsonSchema(schema)

  const response = await this.client.chat.completions.create({
    model: this.config.model,
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 4096,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: options?.schemaName || "output",
        schema: jsonSchema,
        strict: options?.strict !== false
      }
    },
    messages: [
      {
        role: "system",
        content: `You are a requirements extraction expert.
                  Output valid JSON matching the provided schema.`
      },
      { role: "user", content: prompt }
    ]
  })

  return schema.parse(JSON.parse(response.choices[0].message.content))
}
```

**Advantages**:
- JSON mode guarantees valid JSON (no parsing errors)
- Strict schema validation available
- Function calling for multi-turn interactions
- Excellent for structured data extraction

**Best For**: Consistent JSON output, API specifications, data extraction

#### Google Gemini

**Native Support**: Schema Mode (Structured Output)

```typescript
// Google's approach: native schema support
async generateStructured<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options?: StructuredOptions
): Promise<T> {
  const responseSchema = zodToGeminiBounds(schema)

  const generativeModel = this.client.getGenerativeModel(
    { model: this.config.model },
    {
      apiVersion: "v1beta",
      baseURL: "https://generativelanguage.googleapis.com"
    }
  )

  const response = await generativeModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseSchema: responseSchema,
      responseMimeType: "application/json"
    }
  })

  return schema.parse(
    JSON.parse(response.response.text())
  )
}
```

**Advantages**:
- Native schema support (ResponseSchema in API)
- Fast and cost-effective
- Good for simple to moderately complex outputs
- Built-in JSON validation

**Best For**: Cost-optimized structured output, fast processing

### Comparison Matrix

| Feature | Anthropic | OpenAI | Google |
|---------|-----------|--------|--------|
| **Structured Output** | Tool Use | JSON Mode | Schema Mode |
| **JSON Guarantee** | Via tool parsing | Native (strict) | Native (native) |
| **Validation Level** | Tool schema | JSON schema | Google bounds |
| **Best For** | Complex logic | Data extraction | Simple structures |
| **Cost** | Higher | Medium | Lower |
| **Speed** | Slower | Medium | Faster |
| **Context Window** | 200K | 128K | 1M |
| **Vision Support** | Yes | Yes | Yes |
| **Streaming** | Yes | Yes | Yes (experimental) |
| **Batch API** | Yes | No | No |

---

## 3. Cost Tracking Approach

### Token Counting Strategy

```typescript
interface TokenCounter {
  countPromptTokens(text: string): number
  countCompletionTokens(text: string): number
  estimateCost(
    inputTokens: number,
    outputTokens: number
  ): number
}

// Implementation for each provider
class AnthropicTokenCounter implements TokenCounter {
  // Use Anthropic's token counting endpoint
  async countPromptTokens(text: string): Promise<number> {
    const response = await this.client.messages.countTokens({
      model: this.model,
      messages: [{ role: "user", content: text }]
    })
    return response.input_tokens
  }

  estimateCost(input: number, output: number): number {
    // Sonnet 4.5: $3/1M input, $15/1M output
    return (input * 3 + output * 15) / 1_000_000
  }
}

class OpenAITokenCounter implements TokenCounter {
  // Use js-tiktoken for local estimation
  countPromptTokens(text: string): number {
    const encoding = encoding_for_model("gpt-4")
    return encoding.encode(text).length
  }

  estimateCost(input: number, output: number): number {
    // GPT-4 Turbo: $10/1M input, $30/1M output
    return (input * 10 + output * 30) / 1_000_000
  }
}

class GoogleTokenCounter implements TokenCounter {
  // Use Google's counting method
  async countPromptTokens(text: string): Promise<number> {
    const response = await this.model.countTokens({ content: text })
    return response.totalTokens
  }

  estimateCost(input: number, output: number): number {
    // Gemini Pro: $0.5/1M input, $1.5/1M output
    return (input * 0.5 + output * 1.5) / 1_000_000
  }
}
```

### Cost Tracking Service

```typescript
interface CostTrackingService {
  recordUsage(
    provider: string,
    inputTokens: number,
    outputTokens: number,
    skill: string
  ): Promise<void>

  getCost(skillName?: string): Promise<number>
  getUsageByProvider(): Promise<Map<string, number>>
  getUsageBySkill(): Promise<Map<string, number>>

  checkBudgetLimit(maxCost: number): boolean
  getEstimatedCost(): number
}

class LocalCostTracker implements CostTrackingService {
  private usage: Array<{
    timestamp: Date
    provider: string
    skill: string
    inputTokens: number
    outputTokens: number
    cost: number
  }> = []

  async recordUsage(
    provider: string,
    inputTokens: number,
    outputTokens: number,
    skill: string
  ): Promise<void> {
    const provider = this.getProvider(provider)
    const cost = provider.estimateCost(inputTokens, outputTokens)

    this.usage.push({
      timestamp: new Date(),
      provider,
      skill,
      inputTokens,
      outputTokens,
      cost
    })

    // Persist to .prism/cost-log.json
    await this.persist()

    // Check limit
    if (this.getCost() > this.costLimit) {
      this.emitWarning(`Cost limit exceeded: $${this.getCost()}`)
    }
  }

  getCost(skillName?: string): number {
    return this.usage
      .filter(u => !skillName || u.skill === skillName)
      .reduce((sum, u) => sum + u.cost, 0)
  }

  getUsageByProvider(): Map<string, number> {
    const map = new Map<string, number>()
    for (const { provider, cost } of this.usage) {
      map.set(provider, (map.get(provider) || 0) + cost)
    }
    return map
  }

  getUsageBySkill(): Map<string, number> {
    const map = new Map<string, number>()
    for (const { skill, cost } of this.usage) {
      map.set(skill, (map.get(skill) || 0) + cost)
    }
    return map
  }

  checkBudgetLimit(maxCost: number): boolean {
    return this.getCost() < maxCost
  }
}
```

### Cost Estimation Examples

**MT-PRISM Workflow Costs** (per execution):

| Provider | Typical Workflow | Input Tokens | Output Tokens | Cost |
|----------|------------------|-------------|---------------|------|
| **Anthropic Claude** | PRD analysis + validation + TDD | ~40K | ~12K | ~$4.10 |
| **OpenAI GPT-4** | (same) | ~40K | ~12K | ~$5.30 |
| **Google Gemini** | (same) | ~40K | ~12K | ~$1.25 |

**Cost Optimization Strategies**:

1. **Task-Specific Provider Selection**: Use Gemini for simple tasks, Claude for complex
2. **Caching**: Cache common prompts (e.g., extraction instructions)
3. **Batch Processing**: Use Claude's Batch API for off-peak workflows
4. **Prompt Compression**: Minimize prompt size without losing quality

---

## 4. Error Handling Strategy

### Unified Error Handling Architecture

```typescript
enum LLMErrorType {
  // Authentication/Authorization
  INVALID_API_KEY = "INVALID_API_KEY",
  INSUFFICIENT_QUOTA = "INSUFFICIENT_QUOTA",

  // Rate Limiting
  RATE_LIMITED = "RATE_LIMITED",

  // Input Validation
  INVALID_REQUEST = "INVALID_REQUEST",
  CONTEXT_LENGTH_EXCEEDED = "CONTEXT_LENGTH_EXCEEDED",

  // Server/Network
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",

  // Output Validation
  INVALID_RESPONSE = "INVALID_RESPONSE",
  SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED",

  // Provider-Specific
  VISION_NOT_SUPPORTED = "VISION_NOT_SUPPORTED",
  MODEL_NOT_FOUND = "MODEL_NOT_FOUND",

  // Unknown
  UNKNOWN = "UNKNOWN"
}

class LLMError extends Error {
  constructor(
    public type: LLMErrorType,
    message: string,
    public provider: string,
    public statusCode?: number,
    public originalError?: Error,
    public retryable: boolean = false,
    public retryAfterMs?: number
  ) {
    super(message)
    this.name = "LLMError"
  }
}

// Error classification per provider
class ErrorClassifier {
  static classifyAnthropicError(error: any): LLMError {
    if (error.status === 401) {
      return new LLMError(
        LLMErrorType.INVALID_API_KEY,
        "Invalid Anthropic API key",
        "anthropic",
        401,
        error,
        false
      )
    }
    if (error.status === 429) {
      return new LLMError(
        LLMErrorType.RATE_LIMITED,
        "Rate limit exceeded",
        "anthropic",
        429,
        error,
        true,
        parseInt(error.headers["retry-after"]) * 1000
      )
    }
    if (error.status === 400) {
      if (error.message.includes("max_tokens")) {
        return new LLMError(
          LLMErrorType.CONTEXT_LENGTH_EXCEEDED,
          "Request exceeds context window",
          "anthropic",
          400,
          error,
          true  // Can retry with smaller input
        )
      }
    }
    // ... more classifications
  }

  static classifyOpenAIError(error: any): LLMError {
    // Similar pattern for OpenAI
  }

  static classifyGoogleError(error: any): LLMError {
    // Similar pattern for Google
  }
}
```

### Retry Strategy with Exponential Backoff

```typescript
interface RetryConfig {
  maxRetries: number              // Default: 3
  initialDelayMs: number          // Default: 1000
  maxDelayMs: number              // Default: 30000
  backoffMultiplier: number       // Default: 2
  jitterFactor: number            // Default: 0.1 (10% jitter)
}

class RetryHandler {
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 30000,
      backoffMultiplier = 2,
      jitterFactor = 0.1
    } = config

    let lastError: LLMError
    let delayMs = initialDelayMs

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = ErrorClassifier.classify(error)

        // Don't retry non-retryable errors
        if (!lastError.retryable) {
          throw lastError
        }

        // Don't retry if we've exhausted attempts
        if (attempt === maxRetries) {
          throw lastError
        }

        // Respect provider's retry-after header
        const waitMs = lastError.retryAfterMs || delayMs

        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} ` +
          `after ${waitMs}ms due to ${lastError.type}`
        )

        // Wait with jitter
        const jitter = waitMs * jitterFactor * Math.random()
        await sleep(waitMs + jitter)

        // Exponential backoff
        delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs)
      }
    }

    throw lastError
  }
}
```

### Fallback Strategy

```typescript
interface FallbackConfig {
  primaryProvider: string
  fallbacks: Array<{
    provider: string
    condition?: (error: LLMError) => boolean  // When to fallback
  }>
  maxFallbacks?: number           // Default: 2
}

class FallbackManager {
  async executeWithFallback<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    config: FallbackConfig
  ): Promise<T> {
    const providersToTry = [
      { provider: config.primaryProvider },
      ...(config.fallbacks || [])
    ]

    let lastError: LLMError

    for (let i = 0; i < providersToTry.length; i++) {
      const { provider, condition } = providersToTry[i]

      try {
        const providerInstance = await createLLMProvider({
          provider: provider as any
        })

        return await operation(providerInstance)
      } catch (error) {
        lastError = ErrorClassifier.classify(error)

        // Check if fallback condition is met
        if (condition && !condition(lastError)) {
          throw lastError
        }

        // Don't try more fallbacks if this was the last one
        if (i === providersToTry.length - 1) {
          throw lastError
        }

        console.log(
          `${provider} failed (${lastError.type}), ` +
          `falling back to ${providersToTry[i + 1].provider}`
        )
      }
    }

    throw lastError
  }
}

// Usage example
const fallbackManager = new FallbackManager()
const result = await fallbackManager.executeWithFallback(
  async (provider) => {
    return await provider.generateText(prompt)
  },
  {
    primaryProvider: "anthropic",
    fallbacks: [
      {
        provider: "openai",
        condition: (error) =>
          error.type === LLMErrorType.RATE_LIMITED ||
          error.type === LLMErrorType.SERVICE_UNAVAILABLE
      },
      {
        provider: "google"
        // No condition = always fallback if previous failed
      }
    ]
  }
)
```

---

## 5. Streaming Response Handling

### Provider-Specific Streaming Implementation

```typescript
interface StreamingOptions extends GenerateOptions {
  onChunk?: (chunk: string) => void     // Callback for each chunk
  onError?: (error: LLMError) => void   // Error callback
  onComplete?: () => void                // Completion callback
}

class StreamingHandler {
  async streamTextWithRetry(
    provider: LLMProvider,
    prompt: string,
    options: StreamingOptions = {}
  ): Promise<string> {
    const generator = provider.streamText(prompt, options)
    let fullResponse = ""

    for await (const chunk of generator) {
      fullResponse += chunk
      options.onChunk?.(chunk)

      // Real-time validation during streaming
      if (options.validatePartial) {
        this.validatePartialJson(fullResponse)
      }
    }

    options.onComplete?.()
    return fullResponse
  }

  // Anthropic streaming
  static async *streamAnthropicText(
    prompt: string,
    options: GenerateOptions
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: options.model || this.defaultModel,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      messages: [{ role: "user", content: prompt }]
    })

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        const delta = event.delta
        if (delta.type === "text_delta") {
          yield delta.text
        }
      }
    }
  }

  // OpenAI streaming
  static async *streamOpenAIText(
    prompt: string,
    options: GenerateOptions
  ): AsyncGenerator<string> {
    const stream = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      stream: true,
      messages: [{ role: "user", content: prompt }]
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }

  // Google streaming
  static async *streamGoogleText(
    prompt: string,
    options: GenerateOptions
  ): AsyncGenerator<string> {
    const stream = await this.model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7
      }
    })

    for await (const chunk of stream) {
      const text = chunk.text
      if (text) {
        yield text
      }
    }
  }
}
```

### Structured Streaming (JSON)

```typescript
interface StructuredStreamingOptions extends GenerateOptions {
  schemaName?: string
  onPartialObject?: (partial: any) => void  // For partial validation
}

class StructuredStreamingHandler {
  async *streamStructuredText<T>(
    provider: LLMProvider,
    prompt: string,
    schema: ZodSchema<T>,
    options: StructuredStreamingOptions = {}
  ): AsyncGenerator<Partial<T>> {
    let buffer = ""
    let objectDepth = 0
    let inString = false
    let lastValidObject: Partial<T> = {}

    for await (const chunk of provider.streamText(prompt, options)) {
      buffer += chunk

      // Track JSON object completion
      for (const char of chunk) {
        if (char === '"' && buffer[buffer.length - 2] !== "\\") {
          inString = !inString
        }
        if (!inString) {
          if (char === "{") objectDepth++
          if (char === "}") objectDepth--
        }

        // Try to parse complete objects
        if (objectDepth === 0 && buffer.includes("}")) {
          const objectMatch = buffer.match(/\{[^{}]*\}/)
          if (objectMatch) {
            try {
              const partial = JSON.parse(objectMatch[0])
              // Validate against schema (partial allowed)
              if (options.allowPartial) {
                lastValidObject = partial
                yield partial
              }
              buffer = buffer.replace(objectMatch[0], "")
            } catch (e) {
              // Not valid JSON yet, continue buffering
            }
          }
        }
      }
    }

    // Parse final complete object
    if (buffer.trim()) {
      try {
        const final = JSON.parse(buffer)
        const validated = schema.parse(final)
        yield validated
      } catch (e) {
        // Return last valid partial
        yield lastValidObject
      }
    }
  }
}
```

---

## 6. Implementation Example: Complete TypeScript Module

```typescript
// src/llm/types.ts
export interface GenerateOptions {
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
  topP?: number
  model?: string
  timeout?: number
  retryCount?: number
}

export interface LLMProvider {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>
  streamText(prompt: string, options?: GenerateOptions): AsyncGenerator<string>
  generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T>
  getInfo(): ProviderInfo
  estimateCost(input: number, output: number): number
}

export interface ProviderInfo {
  name: string
  displayName: string
  defaultModel: string
  supportedModels: string[]
  maxContextWindow: number
  costPer1MInputTokens: number
  costPer1MOutputTokens: number
}

// src/llm/factory.ts
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function createLLMProvider(
  config?: { provider?: string; apiKey?: string; model?: string }
): Promise<LLMProvider> {
  const provider = config?.provider || process.env.AI_PROVIDER || "anthropic"

  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(config?.apiKey, config?.model)
    case "openai":
      return new OpenAIProvider(config?.apiKey, config?.model)
    case "google":
      return new GoogleProvider(config?.apiKey, config?.model)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// src/llm/providers/anthropic.ts
class AnthropicProvider implements LLMProvider {
  private client: Anthropic
  private defaultModel = "claude-sonnet-4-5-20250929"

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({ apiKey })
    this.defaultModel = model || this.defaultModel
  }

  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      messages: [{ role: "user", content: prompt }]
    })

    const content = response.content[0]
    if (content.type === "text") {
      return content.text
    }
    throw new Error("Unexpected response type")
  }

  async *streamText(
    prompt: string,
    options?: GenerateOptions
  ): AsyncGenerator<string> {
    const stream = await this.client.messages.stream({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature,
      messages: [{ role: "user", content: prompt }]
    })

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        const delta = event.delta
        if (delta.type === "text_delta") {
          yield delta.text
        }
      }
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    // Use tool_use for structured output
    const tools = [
      {
        name: "return_structured_output",
        description: "Return structured data matching the schema",
        input_schema: zodToAnthropicSchema(schema)
      }
    ]

    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 4096,
      tools,
      messages: [{ role: "user", content: prompt }]
    })

    const toolUse = response.content.find((block) => block.type === "tool_use")
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("No tool use in response")
    }

    return schema.parse(toolUse.input)
  }

  getInfo(): ProviderInfo {
    return {
      name: "anthropic",
      displayName: "Anthropic Claude",
      defaultModel: this.defaultModel,
      supportedModels: ["claude-sonnet-4-5-20250929", "claude-opus-4-20250514", "claude-haiku-3-5-20250219"],
      maxContextWindow: 200000,
      costPer1MInputTokens: 3,
      costPer1MOutputTokens: 15
    }
  }

  estimateCost(input: number, output: number): number {
    const info = this.getInfo()
    return (input * info.costPer1MInputTokens + output * info.costPer1MOutputTokens) / 1_000_000
  }
}

// Similar implementations for OpenAIProvider and GoogleProvider
```

---

## 7. Alternatives Considered

### Alternative 1: Single Unified API Wrapper
**Approach**: Build custom API that mirrors one provider's interface
**Pros**:
- Simple implementation
- Single interface to maintain
**Cons**:
- Doesn't leverage provider-specific strengths
- Less optimal performance/cost
- Harder to add new features per provider
**Verdict**: ❌ Rejected - Too limiting

### Alternative 2: Provider-Agnostic DSL
**Approach**: Create domain-specific language for LLM requests
**Pros**:
- Maximum flexibility
- Can express complex requirements
**Cons**:
- Very complex to implement
- Steep learning curve for users
- Over-engineered for current needs
**Verdict**: ❌ Rejected - Over-engineered

### Alternative 3: Direct SDK Integration
**Approach**: Call each provider SDK directly in skill code
**Pros**:
- Most flexible
- Full access to provider features
**Cons**:
- Tight coupling to providers
- Hard to switch providers
- Code duplication
- Provider-specific error handling everywhere
**Verdict**: ❌ Rejected - Violates separation of concerns

### Alternative 4: LLMChain-Style Library
**Approach**: Use existing library like LangChain or LlamaIndex
**Pros**:
- Pre-built integration with many providers
- Community support
**Cons**:
- Heavy dependencies
- Overhead for our simple use case
- Less control
- Cost tracking harder
**Verdict**: ❌ Rejected - Too heavyweight for this project

### Chosen: Adapter Pattern + Factory (Selected)
**Approach**: Provider-specific adapters implementing common interface
**Pros**:
- ✅ Clean separation of concerns
- ✅ Easy to add new providers
- ✅ Can optimize per-provider
- ✅ Full control over error handling
- ✅ Minimal dependencies
- ✅ Easy to test
- ✅ Clear to understand
**Verdict**: ✅ Selected - Best fit for MT-PRISM

---

## 8. Key Implementation Decisions

### Decision 1: Streaming as AsyncGenerator

**Choice**: Use `AsyncGenerator<string>` for streaming

**Rationale**:
- Native TypeScript/JavaScript feature
- Memory efficient
- Composable with async iterators
- Works with event handlers
- No external dependencies

```typescript
// Good example
for await (const chunk of provider.streamText(prompt)) {
  console.log(chunk)
}

// vs bad alternative (callback hell)
await provider.streamText(prompt, {
  onChunk: (chunk) => console.log(chunk),
  onError: (err) => console.error(err),
  onComplete: () => console.log("done")
})
```

### Decision 2: Zod for Schema Validation

**Choice**: Zod for runtime schema validation

**Rationale**:
- Works with TypeScript for compile-time types
- Runtime validation ensures output quality
- Easy to convert to JSON Schema (OpenAI)
- Excellent error messages
- No dependencies on provider SDKs

```typescript
const RequirementSchema = z.object({
  id: z.string(),
  description: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"])
})

const result = await provider.generateStructured(
  prompt,
  RequirementSchema
)
// type is inferred as z.infer<typeof RequirementSchema>
```

### Decision 3: Separate Cost Tracking

**Choice**: Dedicated CostTrackingService separate from provider

**Rationale**:
- Decoupled from provider logic
- Easier to test
- Can aggregate costs across skills
- Easy to implement cost budgets
- Provider implementations stay focused

### Decision 4: Provider Configuration via Environment

**Choice**: Environment variables for configuration

**Rationale**:
- Simple for users
- Follows 12-factor app principles
- Secure (no hardcoded secrets)
- Works in all environments
- Clear .env.example documentation

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx        # Optional
GOOGLE_API_KEY=xxxxx           # Optional
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

---

## 9. Risk Mitigation

### Risk: Provider API Changes
**Mitigation**: Adapter pattern isolates provider changes to single file

### Risk: Token Counting Inaccuracy
**Mitigation**: Use provider's official token counting when available

### Risk: Cost Tracking Errors
**Mitigation**:
- Log all token counts for manual verification
- Include estimated cost in responses
- Clear documentation of pricing

### Risk: Streaming Interruptions
**Mitigation**:
- Save stream progress to local cache
- Resume capability with session management
- Clear error messages to user

---

## 10. Performance Targets

| Operation | Target | Approach |
|-----------|--------|----------|
| **Streaming Response** | First chunk < 500ms | Streaming enables real-time feedback |
| **Token Counting** | < 100ms | Cache provider token counts |
| **Fallback Switch** | < 2s | Pre-initialize backup providers |
| **Cost Calculation** | < 50ms | In-memory tracking |
| **Error Classification** | < 10ms | Pattern matching on response |

---

## 11. Testing Strategy

```typescript
// tests/llm/providers.test.ts
describe("LLMProvider", () => {
  describe("Anthropic", () => {
    it("should generate text", async () => {
      const provider = new AnthropicProvider()
      const result = await provider.generateText("Hello")
      expect(result).toBeDefined()
    })

    it("should handle rate limits", async () => {
      // Mock 429 response
      // Expect retry with backoff
    })

    it("should generate structured output", async () => {
      const provider = new AnthropicProvider()
      const schema = z.object({ name: z.string() })
      const result = await provider.generateStructured(
        "Extract name from text",
        schema
      )
      expect(result).toHaveProperty("name")
    })
  })

  describe("Error Handling", () => {
    it("should classify rate limit errors", () => {
      const error = new LLMError(LLMErrorType.RATE_LIMITED, "msg", "anthropic")
      expect(error.retryable).toBe(true)
    })

    it("should not retry invalid API key", () => {
      const error = new LLMError(LLMErrorType.INVALID_API_KEY, "msg", "anthropic")
      expect(error.retryable).toBe(false)
    })
  })

  describe("Cost Tracking", () => {
    it("should track costs correctly", () => {
      const tracker = new LocalCostTracker()
      tracker.recordUsage("anthropic", 1000, 500, "test")
      expect(tracker.getCost()).toBeCloseTo(0.0075, 6)
    })
  })
})
```

---

## 12. Conclusion

The **Adapter Pattern with Factory** is the optimal architecture for MT-PRISM's multi-provider LLM abstraction layer because it:

1. **Provides Clean Separation**: Skills never know about provider details
2. **Enables Optimization**: Each provider can use native features optimally
3. **Simplifies Testing**: Mock any provider easily
4. **Facilitates Growth**: Add new providers with minimal changes
5. **Maintains Quality**: Clear error handling and cost tracking
6. **Prioritizes Performance**: Streaming, caching, and async/await native

**Next Steps for Implementation**:
1. Create base `LLMProvider` interface
2. Implement provider-specific adapters
3. Build factory with environment configuration
4. Add error classification and retry logic
5. Implement cost tracking service
6. Add streaming support
7. Comprehensive testing for all providers
8. Documentation and examples

---

**Document Version**: 1.0
**Status**: Research Complete - Ready for Implementation
**Next Review**: After Phase 1 (LLM abstraction implementation)

