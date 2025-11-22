# LLM Provider Abstraction Layer - Research Summary

**Research Completed**: 2025-11-20
**Status**: Ready for Implementation
**Project**: MT-PRISM Multi-Provider Plugin

---

## Executive Summary

This research defines the optimal architecture for supporting multiple LLM providers (Claude, GPT-4, Gemini) in MT-PRISM while maintaining unified interfaces, per-provider optimizations, and robust error handling.

**Recommendation**: Implement the **Adapter Pattern with Factory** design, providing a clean abstraction layer that allows skills to remain provider-agnostic while leveraging provider-specific optimizations.

---

## Key Findings

### 1. Recommended Architecture Pattern

**Pattern**: Adapter + Factory

```
Skills (Provider-Agnostic)
    ↓
LLM Interface (Unified)
    ↓
Provider Adapters (Anthropic, OpenAI, Google)
    ↓
Provider APIs (HTTP)
```

**Why This Pattern**:
- Clean separation between business logic and provider details
- Each provider can optimize using native features
- Easy to add new providers
- Simple error handling and retry logic
- Minimal dependencies
- Excellent testability

### 2. Provider-Specific Structured Output

Each provider handles structured output natively:

| Provider | Method | Advantage |
|----------|--------|-----------|
| **Anthropic** | Tool Use | Complex multi-step logic, tool iteration |
| **OpenAI** | JSON Mode | Guaranteed valid JSON, strict validation |
| **Google** | Schema Mode | Native schema support, cost-effective |

**Implementation Strategy**: Create adapters that convert Zod schemas to each provider's format (tool definitions, JSON schema, or response schemas).

### 3. Cost Tracking Approach

**Multi-Level Strategy**:
1. **Token Counting**: Use provider APIs when available, fallback to estimation
2. **Usage Recording**: Log all requests with timestamps and costs
3. **Budgeting**: Implement soft limits (warning) and hard limits (error)
4. **Aggregation**: Track by provider, skill, and time period

**Cost Reality** (per typical MT-PRISM workflow):
- Claude (Anthropic): ~$4.10
- GPT-4 (OpenAI): ~$5.30
- Gemini (Google): ~$1.25

### 4. Error Handling Strategy

**Three-Tier Approach**:

1. **Error Classification**: Map provider-specific errors to unified types
   - INVALID_API_KEY (non-retryable)
   - RATE_LIMITED (retryable with backoff)
   - SERVICE_UNAVAILABLE (retryable)
   - CONTEXT_LENGTH_EXCEEDED (retryable with smaller input)

2. **Retry Logic**: Exponential backoff with jitter
   - Default: 3 retries, 1s initial delay, 2x multiplier, 30s max
   - Respect provider rate-limit headers
   - Don't retry non-retryable errors

3. **Fallback Chain**: Try alternative providers
   - Primary: Anthropic (quality)
   - Secondary: OpenAI (balance)
   - Tertiary: Google (cost)

### 5. Streaming Response Handling

**Approach**: AsyncGenerator<string> pattern

**Benefits**:
- Native TypeScript feature
- Memory efficient (no buffering entire response)
- Works with event handlers
- Composable with other async iterators
- No external dependencies

**Special Case - Structured Streaming**:
- Validate partial JSON as it streams
- Emit complete objects when parsed
- Fallback to last valid partial if incomplete

### 6. Implementation Priorities

**Phase 1 - Core Abstraction** (Week 1):
1. Define LLMProvider interface
2. Implement Anthropic adapter
3. Implement OpenAI adapter
4. Implement Google adapter
5. Factory with configuration
6. Basic error handling

**Phase 2 - Advanced Features** (Week 2):
1. Retry logic with exponential backoff
2. Cost tracking service
3. Fallback mechanism
4. Streaming support
5. Structured output handling

**Phase 3 - Polish** (Week 3):
1. Comprehensive error messages
2. Cost estimation before requests
3. Prompt optimization guidance
4. Provider health checks
5. Full test coverage

---

## Architecture Diagram

```typescript
┌────────────────────────────────────────────┐
│     MT-PRISM Skills (Provider-Agnostic)   │
│  • PRD Analyzer                            │
│  • Figma Analyzer                          │
│  • Validator                               │
│  • TDD Generator                           │
└────────────────┬─────────────────────────┘
                 │
         ┌───────▼────────┐
         │  LLM Factory   │
         │  (Config)      │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│Anthropic│  │ OpenAI │  │ Google │
│Adapter  │  │Adapter │  │Adapter │
└───┬────┘  └───┬────┘  └───┬────┘
    │           │           │
    └───────────┼───────────┘
                │
        ┌───────▼────────┐
        │ Provider APIs  │
        │  (HTTP/REST)   │
        └────────────────┘
```

---

## Code Implementation Template

### 1. Core Interface

```typescript
interface LLMProvider {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>
  streamText(prompt: string, options?: GenerateOptions): AsyncGenerator<string>
  generateStructured<T>(prompt: string, schema: ZodSchema<T>): Promise<T>
  getInfo(): ProviderInfo
  estimateCost(input: number, output: number): number
}

interface GenerateOptions {
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
  topP?: number
  model?: string
  timeout?: number
  retryCount?: number
}
```

### 2. Factory Pattern

```typescript
async function createLLMProvider(config?: {
  provider?: 'anthropic' | 'openai' | 'google'
  apiKey?: string
  model?: string
  fallbacks?: Array<{ provider: string; apiKey?: string }>
}): Promise<LLMProvider> {
  const provider = config?.provider || process.env.AI_PROVIDER || 'anthropic'

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(config?.apiKey, config?.model)
    case 'openai':
      return new OpenAIProvider(config?.apiKey, config?.model)
    case 'google':
      return new GoogleProvider(config?.apiKey, config?.model)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
```

### 3. Error Handling

```typescript
enum LLMErrorType {
  INVALID_API_KEY,
  RATE_LIMITED,
  SERVICE_UNAVAILABLE,
  CONTEXT_LENGTH_EXCEEDED,
  SCHEMA_VALIDATION_FAILED,
  TIMEOUT,
  UNKNOWN
}

class LLMError extends Error {
  constructor(
    public type: LLMErrorType,
    message: string,
    public provider: string,
    public retryable: boolean = false,
    public retryAfterMs?: number
  ) {
    super(message)
  }
}
```

### 4. Cost Tracking

```typescript
class CostTracker {
  recordUsage(provider: string, inputTokens: number, outputTokens: number): void
  getCost(skillName?: string): number
  getUsageByProvider(): Map<string, number>
  checkBudgetLimit(maxCost: number): boolean
}
```

---

## Configuration Examples

### Single Provider (Simplest)

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### Multiple Providers with Fallback

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx

# Code
const llm = createLLMProvider({
  fallbacks: [
    { provider: 'openai' },
    { provider: 'google' }
  ]
})
```

### Task-Specific Providers

```typescript
const config = {
  prdAnalyzer: 'anthropic',    // Best quality for complex analysis
  figmaAnalyzer: 'openai',     // Good balance for structured data
  validator: 'google',          // Cost-effective for simpler tasks
  tddGenerator: 'anthropic'    // Best quality for comprehensive docs
}
```

---

## Testing Strategy

### Unit Tests
- Each provider adapter tested independently
- Mock API responses
- Error classification tests
- Token counting accuracy

### Integration Tests
- All providers with real test prompts
- Fallback mechanism
- Cost tracking accuracy
- Retry logic

### E2E Tests
- Full skill workflows with each provider
- Quality comparison
- Performance benchmarking
- Cost validation

---

## Performance Targets

| Operation | Target | Approach |
|-----------|--------|----------|
| **Text Generation** | < 5s | Direct provider calls |
| **Streaming First Chunk** | < 500ms | Streaming enables real-time |
| **Structured Output** | < 10s | Schema validation |
| **Fallback Switch** | < 2s | Pre-configured providers |
| **Cost Estimation** | < 50ms | In-memory tracking |

---

## Security Considerations

1. **API Key Management**:
   - Store in .env (gitignore)
   - Never log API keys
   - Rotate regularly
   - Use environment variables only

2. **Data Privacy**:
   - Clear documentation about data sent to providers
   - No data stored on our servers (local-first)
   - Users control which provider they use
   - Option to redact sensitive info

3. **Request Validation**:
   - Validate prompt length before sending
   - Catch oversized requests early
   - Proper error messages to users

---

## Scalability Considerations

### Current Scope (Plugin)
- Single user, local execution
- < 20 min per workflow
- Cost: ~$2-5 per workflow
- Perfect for individual developers and small teams

### Future Scaling (If Needed)
- This architecture supports up to ~100 concurrent workflows
- Beyond that, migrate to distributed system
- 70-80% of code is reusable
- Migration effort: 12-16 weeks

---

## Known Limitations

1. **Context Window**: Google Gemini has only 32K context (vs 200K for Claude)
   - Mitigation: Offer warnings for large inputs, suggest chunking

2. **Streaming**: Google Gemini streaming is experimental
   - Mitigation: Fall back to polling/batch for Gemini

3. **Consistency**: Different providers have slightly different quality
   - Mitigation: Provide quality tiers in config, human review option

4. **Cost Variations**: Token pricing differs significantly
   - Mitigation: Clear cost estimation, budget limits

---

## Next Steps

### Immediate (Week 1)
1. Create LLMProvider interface and types
2. Implement Anthropic adapter
3. Implement OpenAI adapter
4. Implement Google adapter
5. Factory with configuration

### Week 2
1. Error classification and retry logic
2. Cost tracking service
3. Fallback mechanism
4. Streaming support
5. Integration tests

### Week 3+
1. Structured output handling
2. Performance optimization
3. Comprehensive documentation
4. Beta testing with real workflows

---

## Files to Create/Modify

### New Files
```
src/llm/
  ├── types.ts              # Interfaces and types
  ├── factory.ts            # Provider factory
  ├── providers/
  │   ├── anthropic.ts      # Anthropic adapter
  │   ├── openai.ts         # OpenAI adapter
  │   └── google.ts         # Google adapter
  ├── errors.ts             # Error handling
  ├── cost-tracker.ts       # Cost tracking
  └── streaming.ts          # Streaming utilities

tests/llm/
  ├── providers.test.ts      # Provider tests
  ├── errors.test.ts         # Error handling tests
  ├── cost-tracker.test.ts   # Cost tracking tests
  └── streaming.test.ts      # Streaming tests
```

### Modified Files
```
.env.example               # Add all provider keys
package.json              # Add provider SDKs
src/index.ts             # Export LLM utilities
```

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All 3 providers working
- [ ] Factory pattern implemented
- [ ] Basic error handling in place
- [ ] Cost estimation accurate
- [ ] 90%+ test coverage on core

### Phase 2 Complete When:
- [ ] Retry logic working with all providers
- [ ] Cost tracking recording all usage
- [ ] Fallback mechanism tested
- [ ] Streaming support working
- [ ] All edge cases handled

### Phase 3 Complete When:
- [ ] All skills work with all providers
- [ ] No provider-specific code in skills
- [ ] Performance targets met
- [ ] Complete documentation
- [ ] Ready for production use

---

## References

### Official Documentation
- [Anthropic Claude API](https://docs.anthropic.com)
- [OpenAI API](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)

### Implementation Resources
- Full architecture details: `LLM_ABSTRACTION_ARCHITECTURE.md`
- Provider comparison: `LLM_PROVIDER_GUIDE.md` (existing)
- Configuration guide: See `.env.example`

---

## Questions & Discussion

This research provides the foundation for Phase 1 of MT-PRISM implementation. Questions to resolve during implementation:

1. **Caching Strategy**: Should we cache provider responses? (Recommended: Yes, with TTL)
2. **Monitoring**: What metrics to track? (Recommended: Latency, cost, success rate per provider)
3. **User Guidance**: Should we recommend providers per skill? (Recommended: Yes, with cost/quality trade-offs)

---

**Document Status**: Research Complete
**Ready for**: Implementation Phase 1
**Estimated Implementation Time**: 4-5 weeks (with full testing)

