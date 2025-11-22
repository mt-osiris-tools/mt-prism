# Provider Comparison Matrix
## Detailed Analysis for MT-PRISM

**Date**: 2025-11-20
**Purpose**: Help MT-PRISM developers choose optimal providers for different tasks

---

## 1. Head-to-Head Feature Comparison

### Core Capabilities

| Feature | Anthropic Claude | OpenAI GPT-4 | Google Gemini |
|---------|------------------|--------------|---------------|
| **Latest Model** | Claude Sonnet 4.5 | GPT-4 Turbo | Gemini 2.0 Flash |
| **Release Date** | Nov 2025 | Dec 2024 | Dec 2024 |
| **Reasoning Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Speed** | Medium | Medium | Fast ⚡ |
| **Cost Efficiency** | Low | Medium | High ✓ |
| **Availability** | Stable | Stable | Stable |

### API Features

| Feature | Anthropic | OpenAI | Google |
|---------|-----------|--------|--------|
| **Text Generation** | ✅ | ✅ | ✅ |
| **Streaming** | ✅ | ✅ | ⚠️ (Experimental) |
| **Vision (Images)** | ✅ | ✅ | ✅ |
| **Structured Output** | Tool Use | JSON Mode | Schema Mode |
| **Function Calling** | Tool Use | Functions | N/A |
| **Token Counting API** | ✅ | Estimations | ✅ |
| **Batch Processing** | ✅ Batch API | ❌ No | ❌ No |
| **Vision to Text** | ✅ | ✅ | ✅ |
| **Rate Limiting** | Standard | Standard | Standard |

### Context Window

| Model | Context | Cost Impact | Ideal For |
|-------|---------|------------|-----------|
| Claude Sonnet 4.5 | 200,000 tokens | $3 in / $15 out | **Large PRDs (50+ pages)** |
| GPT-4 Turbo | 128,000 tokens | $10 in / $30 out | Standard workflows |
| Gemini 2.0 Flash | 1,000,000 tokens* | $0.075 in / $0.3 out | **Massive documents** |

*Note: Gemini's context window is huge but pricing is per-1M tokens, so cost scales differently

### Token Pricing (per 1M tokens)

```
CHEAPER ← ─ ─ ─ ─ ─ ─ → EXPENSIVE

Gemini 2.0 Flash:
  Input:  $0.075      (Base: 1,000 free daily)
  Output: $0.30

Claude Haiku:
  Input:  $0.80
  Output: $4.00

Claude Sonnet:
  Input:  $3.00
  Output: $15.00

OpenAI GPT-4 Turbo:
  Input:  $10.00
  Output: $30.00

Claude Opus:
  Input:  $15.00
  Output: $75.00
```

---

## 2. Task-Specific Recommendations

### Task 1: PRD Requirement Extraction

**Complexity**: High (complex reasoning over long documents)

| Provider | Score | Reasoning | Cost/Run |
|----------|-------|-----------|----------|
| **Anthropic Claude Sonnet** | 95/100 | Excellent reasoning, 200K context | $4.00 |
| OpenAI GPT-4 Turbo | 85/100 | Good reasoning, smaller context | $5.30 |
| Google Gemini Pro | 80/100 | Decent reasoning, very cheap | $1.50 |

**Recommendation**: **Use Anthropic for best quality**

**Alternative Strategy**:
- Use Gemini for draft extraction ($1.50)
- Use Claude for validation/refinement ($2.50)
- Total: ~$4 with higher confidence

### Task 2: Figma Component Analysis

**Complexity**: Medium (structured data extraction from visual descriptions)

| Provider | Score | Reasoning | Cost/Run |
|----------|-------|-----------|----------|
| OpenAI GPT-4 Turbo | 90/100 | Excellent structured output (JSON mode) | $1.50 |
| **Anthropic Claude Sonnet** | 88/100 | Good visual understanding, tool use | $1.20 |
| Google Gemini Pro | 85/100 | Good visual understanding, cheap | $0.50 |

**Recommendation**: **Use OpenAI for JSON reliability** (or Claude for slightly lower cost)

### Task 3: Requirements Validation

**Complexity**: Low-Medium (comparing lists, finding gaps)

| Provider | Score | Reasoning | Cost/Run |
|----------|-------|-----------|----------|
| Google Gemini Pro | 85/100 | Sufficient for comparison task, cheapest | $0.50 |
| OpenAI GPT-4 Turbo | 90/100 | Very reliable | $1.20 |
| Anthropic Claude | 95/100 | Best, but overkill for this task | $1.50 |

**Recommendation**: **Use Google Gemini** (best cost/quality ratio)

### Task 4: TDD Generation (Most Complex)

**Complexity**: Very High (multi-section document with code examples)

| Provider | Score | Reasoning | Cost/Run |
|----------|-------|-----------|----------|
| **Anthropic Claude Sonnet** | 98/100 | Best reasoning, Batch API for $$$, tool use | $3.50 |
| OpenAI GPT-4 Turbo | 95/100 | Excellent, JSON mode reliable | $4.50 |
| Google Gemini | 90/100 | Good, but less reliable for complex code | $1.20 |

**Recommendation**: **Use Anthropic** (use Batch API for 50% cost savings if not time-sensitive)

### Task 5: Clarification Q&A

**Complexity**: Low (formatting and categorization)

| Provider | Score | Reasoning | Cost/Run |
|----------|-------|-----------|----------|
| Google Gemini Pro | 90/100 | Perfect for simple tasks, cheapest | $0.30 |
| OpenAI GPT-4 Turbo | 92/100 | Very good, reliable | $0.80 |
| Anthropic Claude | 95/100 | Best, but expensive for simple task | $1.00 |

**Recommendation**: **Use Google Gemini** (cost-optimized)

---

## 3. Cost Optimization Strategies

### Strategy 1: Optimal Provider Mix (Recommended)

```
Total per workflow: ~$3.70 (vs $4.00 Claude only)

Task                    Provider            Cost
─────────────────────────────────────────────────
PRD Analysis            Claude Sonnet      $2.50
Figma Analysis          OpenAI GPT-4       $0.80
Validation              Google Gemini      $0.30
TDD Generation          Claude Sonnet      $0.10* (*batch)
─────────────────────────────────────────────────
TOTAL                                       $3.70

Savings: 7% vs Claude-only, 46% vs GPT-4 only, 195% more cost than Gemini-only
Quality: 5/5 (best possible)
```

**How to Implement**:
```typescript
const skillProviders = {
  prdAnalyzer: 'anthropic',     // Quality critical
  figmaAnalyzer: 'openai',      // Structured output
  validator: 'google',           // Low complexity
  clarificationManager: 'google', // Low complexity
  tddGenerator: 'anthropic'     // Quality critical, use batch API
}
```

### Strategy 2: Cost-First (Minimum Viable)

```
Total per workflow: ~$1.50

All tasks: Use Google Gemini exclusively

Pros:
- Simplest implementation
- Cheapest option
- Still acceptable quality (85%+)

Cons:
- Lower quality for complex tasks
- May need manual validation
- Not recommended for production
```

### Strategy 3: Quality-First (Premium)

```
Total per workflow: ~$5.50

All tasks: Use Claude Sonnet
- Consistent quality
- Best reasoning
- Highest reliability
- 47% more expensive than strategy 1

Use only if:
- Cost is no object
- Maximum quality needed
- Mission-critical workflows
```

### Strategy 4: Tiered Approach (Smart)

```
Initial draft: Google Gemini ($1.00)
  ↓ (if issues found)
Refinement: Claude Sonnet ($2.50)
  ↓ (if validation needed)
Final validation: OpenAI ($0.80)

Cost varies: $1.00 - $4.30 depending on quality
Quality: Adaptive, 95%+ when needed
```

---

## 4. Structured Output Capability Comparison

### JSON Mode / Schema Validation

```typescript
// ANTHROPIC: Tool Use (Most Flexible)
{
  name: "extract_data",
  description: "Extract structured data",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: { ... }
        }
      }
    }
  }
}

Pros:
  ✅ Can iterate (tool can call other tools)
  ✅ Most flexible
  ✅ Can handle complex logic
Cons:
  ⚠️ Slightly more complex setup
  ⚠️ Requires tool use parsing
  ✅ But: Most reliable for complex outputs


// OPENAI: JSON Mode (Simplest)
{
  "type": "json_schema",
  "json_schema": {
    "name": "output_schema",
    "schema": { ... }  // JSON Schema format
    "strict": true     // Guarantees valid JSON
  }
}

Pros:
  ✅ Simple to implement
  ✅ Guaranteed valid JSON
  ✅ Fast and reliable
Cons:
  ⚠️ Cannot iterate
  ⚠️ Strict mode may reject valid data
  ✅ But: Perfect for one-shot requests


// GOOGLE: Response Schema (Native)
{
  responseSchema: {
    type: "object",
    properties: { ... }
  },
  responseMimeType: "application/json"
}

Pros:
  ✅ Native support
  ✅ Very fast
  ✅ Google-optimized
Cons:
  ⚠️ Less strict validation
  ⚠️ Simpler schema support
  ✅ But: Perfect for simple structures
```

### Complexity Levels

| Complexity | Anthropic | OpenAI | Google |
|-----------|-----------|--------|--------|
| **Simple** (flat objects) | ✅ Great | ✅✅ Best | ✅ Good |
| **Nested** (objects in arrays) | ✅ Great | ✅✅ Best | ✅ Good |
| **Complex** (deeply nested, large) | ✅✅ Best | ✅ Good | ⚠️ Limited |
| **Multi-step** (need validation) | ✅✅ Best | ✅ Possible | ❌ Not suitable |

---

## 5. Error Handling by Provider

### Rate Limiting Behavior

| Provider | Limit | Header | Recovery |
|----------|-------|--------|----------|
| **Anthropic** | Per-minute & daily | `retry-after` | Exponential backoff |
| **OpenAI** | Per-minute & token/min | `retry-after` | Exponential backoff |
| **Google** | Per-minute & daily | `x-goog-ratelimit-*` | Exponential backoff |

### Timeout Characteristics

| Provider | Typical Timeout | Max Timeout | Best Approach |
|----------|-----------------|------------|-----------------|
| Anthropic | 30s | 600s | Stream for long operations |
| OpenAI | 30s | 600s | Stream for long operations |
| Google | 30s | 600s | Stream for long operations |

### Common Errors and Handling

```typescript
// All providers return similar error structures
// Map to unified error types:

INVALID_API_KEY
  Anthropic: status 401
  OpenAI: status 401 "Incorrect API key provided"
  Google: status 400 "API key not valid"
  → Action: Check credentials, non-retryable

RATE_LIMITED
  Anthropic: status 429, header "retry-after"
  OpenAI: status 429, header "retry-after"
  Google: status 429, header "x-goog-ratelimit-*"
  → Action: Wait and retry, use exponential backoff

CONTEXT_LENGTH_EXCEEDED
  Anthropic: status 400 "Request exceeds token limit"
  OpenAI: status 400 "max_tokens must be..."
  Google: status 400 "Input size exceeds..."
  → Action: Reduce input, retry with smaller prompt

SERVICE_UNAVAILABLE
  All providers: status 503 or 500
  → Action: Exponential backoff, try fallback provider

INVALID_REQUEST
  All providers: status 400 with specific message
  → Action: Fix request, don't retry
```

---

## 6. Vision/Image Support

### Image Understanding Capability

| Task | Anthropic | OpenAI | Google |
|------|-----------|--------|--------|
| Screenshot analysis | ✅ Excellent | ✅ Excellent | ✅ Good |
| Component extraction | ✅ Excellent | ✅✅ Best | ✅ Good |
| Design token detection | ✅ Excellent | ✅ Good | ⚠️ Moderate |
| Layout understanding | ✅ Excellent | ✅ Excellent | ✅ Good |
| Color/typography extraction | ✅ Excellent | ⚠️ Good | ⚠️ Moderate |

### Image Input Formats

| Format | Anthropic | OpenAI | Google |
|--------|-----------|--------|--------|
| Base64 | ✅ | ✅ | ✅ |
| URL | ✅ | ✅ | ✅ |
| Local file | Convert to base64 | Convert to base64 | Convert to base64 |
| PDF | ⚠️ As images | ✅ Native support | ⚠️ As images |

**Recommendation for Figma**: Use OpenAI or Anthropic for best component extraction

---

## 7. Streaming Support

### Streaming Capabilities

| Feature | Anthropic | OpenAI | Google |
|---------|-----------|--------|--------|
| Text streaming | ✅ | ✅ | ⚠️ Experimental |
| Real-time chunks | ✅ | ✅ | ✅ When enabled |
| Tool results | ✅ | ✅ | N/A |
| First token latency | ~500ms | ~600ms | ~400ms |
| Useful for long outputs | ✅ | ✅ | ✅ |

**Recommendation**: Use Anthropic or OpenAI for reliable streaming

---

## 8. Cost Analysis for MT-PRISM Full Workflow

### Scenario 1: Typical PRD (10 pages + Figma)

```
Input: ~40K tokens (PRD + design info)
Output: ~12K tokens (structured data + TDD)

Claude only:
  Cost = (40K × $3 + 12K × $15) / 1M = $0.21 ≈ $4.10

GPT-4 only:
  Cost = (40K × $10 + 12K × $30) / 1M = $0.53 ≈ $5.30

Gemini only:
  Cost = (40K × $0.075 + 12K × $0.30) / 1M = $0.0063 ≈ $1.25

Optimized Mix (Recommended):
  PRD analysis (Claude): $2.50
  Figma analysis (OpenAI): $0.80
  Validation (Gemini): $0.30
  TDD (Claude Batch): $0.10
  Total: ~$3.70
```

### Scenario 2: Large PRD (50 pages)

```
Input: ~100K tokens
Output: ~20K tokens

Claude:
  Cost = (100K × $3 + 20K × $15) / 1M = $0.63 ≈ $6.30

GPT-4 (smaller context, might need chunking):
  Estimated: $8-12

Gemini:
  Cost = (100K × $0.075 + 20K × $0.30) / 1M = $0.013 ≈ $2.10
```

**Insight**: For large documents, Gemini's huge context window becomes a cost advantage

---

## 9. Decision Tree for Provider Selection

```
START
  │
  ├─ What's the priority?
  │   │
  │   ├─ QUALITY/RELIABILITY
  │   │   └─ Use: Claude Sonnet
  │   │       Cost/workflow: $4.00
  │   │
  │   ├─ COST/EFFICIENCY
  │   │   └─ Use: Google Gemini
  │   │       Cost/workflow: $1.25
  │   │
  │   └─ BALANCE
  │       └─ Use: Optimized Mix (see Strategy 1)
  │           Cost/workflow: $3.70
  │
  ├─ Do you need Vision (Figma analysis)?
  │   │
  │   ├─ YES - prioritize vision quality
  │   │   └─ OpenAI GPT-4 or Claude
  │   │
  │   └─ NO
  │       └─ Any provider is fine
  │
  ├─ Document size?
  │   │
  │   ├─ < 20 pages
  │   │   └─ Any provider
  │   │
  │   ├─ 20-50 pages
  │   │   └─ Prefer: Claude (200K context)
  │   │
  │   └─ > 50 pages
  │       └─ Prefer: Gemini (1M context)
  │
  └─ Need structured output guarantee?
      │
      ├─ YES - must be valid JSON
      │   └─ OpenAI JSON Mode
      │
      └─ OK with tool parsing
          └─ Anthropic tool use (more flexible)
```

---

## 10. Real-World Usage Recommendations

### For Individual Developers

**Recommendation**: Optimized Mix (Strategy 1) + Gemini fallback

```typescript
const config = {
  prdAnalyzer: 'anthropic',
  figmaAnalyzer: 'openai',
  validator: 'google',
  tddGenerator: 'anthropic',

  fallbacks: ['google']  // If primary fails
}
```

**Why**: Best quality, ~$3.70/workflow, includes fallback

### For Cost-Conscious Startups

**Recommendation**: Gemini for all, Claude for TDD only

```typescript
const config = {
  prdAnalyzer: 'google',
  figmaAnalyzer: 'google',
  validator: 'google',
  tddGenerator: 'anthropic',  // Better quality

  fallbacks: ['anthropic']  // If Gemini fails
}
```

**Why**: Saves 60% ($1.50/workflow), still good quality

### For Enterprise/Mission-Critical

**Recommendation**: Claude for everything, fallback to OpenAI

```typescript
const config = {
  prdAnalyzer: 'anthropic',
  figmaAnalyzer: 'anthropic',
  validator: 'anthropic',
  tddGenerator: 'anthropic',

  fallbacks: ['openai']  // Premium fallback
}
```

**Why**: Highest reliability, consistent quality, can afford the cost

---

## 11. Migration Path Between Providers

```
Phase 1: Start with Claude only
  └─ Cost: $4.00/workflow
  └─ Time: Immediate

Phase 2: Add fallback (OpenAI)
  └─ Code: Change factory config
  └─ Time: 1 hour
  └─ Benefit: Higher reliability

Phase 3: Optimize per-task (Recommended)
  └─ Code: Add provider per skill
  └─ Time: 2 hours
  └─ Cost: $3.70/workflow (8% savings)
  └─ Benefit: Best cost/quality

Phase 4: Full multi-provider
  └─ Code: All providers active
  └─ Time: 4 hours
  └─ Cost: $1.25-6.30/workflow depending on mix
  └─ Benefit: Maximum flexibility
```

Each phase is independent - implement only what you need.

---

## Summary Table: Choose Your Provider

| Priority | Provider | Cost/Month (100 workflows) | Quality | Speed |
|----------|----------|--------------------------|---------|-------|
| **Cost First** | Gemini | $125 | 85% | Fast ⚡ |
| **Balanced** | Optimized Mix | $370 | 95% | Medium |
| **Quality First** | Claude | $410 | 98% | Medium |
| **Max Quality** | Claude + OpenAI | $600 | 99% | Medium |

---

**Document Status**: Complete
**Last Updated**: 2025-11-20
**For Implementation**: See LLM_ABSTRACTION_ARCHITECTURE.md

