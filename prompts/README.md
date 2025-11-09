# MT-PRISM Prompt Templates

This directory contains Claude-optimized prompt templates for each MT-PRISM skill. These prompts are designed to extract maximum quality from Claude when processing PRDs, Figma designs, and generating technical documentation.

## Prompt Files

| Prompt | Skill | Purpose |
|--------|-------|---------|
| [prd-analyzer.md](./prd-analyzer.md) | `prism.analyze-prd` | Extract requirements from PRDs |
| [figma-analyzer.md](./figma-analyzer.md) | `prism.analyze-figma` | Extract UI specs from Figma |
| [validator.md](./validator.md) | `prism.validate` | Cross-validate requirements vs. designs |
| [clarification-manager.md](./clarification-manager.md) | `prism.clarify` | Manage stakeholder Q&A |
| [tdd-generator.md](./tdd-generator.md) | `prism.generate-tdd` | Generate comprehensive TDD |

## How to Use These Prompts

### In Development

When implementing a skill:
1. Read the corresponding prompt template
2. Understand the structure and guidelines
3. Use the prompt as a system message to Claude
4. Replace placeholders (e.g., `{PRD_CONTENT}`) with actual data
5. Include few-shot examples when appropriate

### Example Usage

```typescript
import { readFileSync } from 'fs';

// Load prompt template
const promptTemplate = readFileSync('./prompts/prd-analyzer.md', 'utf-8');

// Replace placeholders
const prompt = promptTemplate.replace('{PRD_CONTENT}', prdContent);

// Call Claude
const result = await claude.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 8000,
  messages: [{
    role: 'user',
    content: prompt
  }]
});
```

## Prompt Design Principles

### 1. Clear Role Definition
Each prompt starts with a clear role:
> "You are a senior product analyst specializing in..."

### 2. Explicit Objectives
Numbered list of what Claude needs to accomplish:
1. Objective 1
2. Objective 2
3. Objective 3

### 3. Detailed Guidelines
Comprehensive instructions on:
- What to look for
- How to classify
- What to extract
- How to handle edge cases

### 4. Output Format Specification
Exact YAML/JSON schema with examples

### 5. Few-Shot Examples
2-4 examples showing:
- Input data
- Expected output
- Edge cases

### 6. Quality Checklist
Final checklist Claude should verify before submitting

## Prompt Structure Template

```markdown
# {Skill Name} Prompt

{Role definition}

## Your Objectives
{Numbered list of goals}

## {Topic} Guidelines
{Detailed instructions}

## Output Format
{YAML/JSON schema with examples}

## Few-Shot Examples
{2-4 input/output examples}

## Quality Checklist
{Verification items}

## Data to Process
{Placeholder for actual data}

## Your {Output Type}
{Final instruction to generate output}
```

## Token Usage Estimates

| Prompt | Base Tokens | With Data (Typical) | Total Typical |
|--------|-------------|---------------------|---------------|
| PRD Analyzer | ~3,500 | 10,000-30,000 | 13,500-33,500 |
| Figma Analyzer | ~3,000 | 8,000-20,000 | 11,000-23,000 |
| Validator | ~3,800 | 15,000-25,000 | 18,800-28,800 |
| Clarification | ~2,000 | 2,000-5,000 | 4,000-7,000 |
| TDD Generator | ~4,000 | 20,000-40,000 | 24,000-44,000 |

**Total for full workflow**: ~80K-140K tokens (well within 200K context limit)

## Optimization Tips

### 1. Prompt Caching
Claude supports prompt caching. Mark static parts:
```typescript
{
  role: 'user',
  content: [
    {
      type: 'text',
      text: promptTemplate,  // This can be cached
      cache_control: { type: 'ephemeral' }
    },
    {
      type: 'text',
      text: actualData  // This changes
    }
  ]
}
```

### 2. Streaming for Long Outputs
Use streaming for TDD generation:
```typescript
const stream = await claude.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: prompt }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.delta.text);
}
```

### 3. Temperature Settings
- **Analysis tasks** (PRD, Figma, Validator): temperature = 0 (deterministic)
- **Generation tasks** (TDD, Clarification): temperature = 0.3 (slightly creative)

## Prompt Engineering Best Practices

### Do's ✅
- Be specific about output format
- Provide concrete examples
- Include edge cases
- Use structured output (YAML/JSON)
- Add quality checklists
- Explain the "why" behind instructions

### Don'ts ❌
- Don't be vague ("analyze this")
- Don't rely on implicit understanding
- Don't skip examples
- Don't forget edge cases
- Don't use ambiguous terminology
- Don't overcomplicate unnecessarily

## Testing Prompts

Before using in production:

1. **Test with simple examples**
   - Single requirement
   - Simple component
   - Clear validation case

2. **Test with complex examples**
   - 20+ requirements
   - 40+ components
   - Multiple gaps and inconsistencies

3. **Test edge cases**
   - Empty PRD
   - Malformed data
   - Conflicting information

4. **Measure accuracy**
   - Compare Claude output with manual analysis
   - Calculate precision/recall
   - Iterate on prompts based on results

## Iterating on Prompts

When a prompt doesn't perform well:

1. **Analyze failures**: What did Claude get wrong?
2. **Add examples**: Include the failure case as a new example
3. **Clarify instructions**: Make guidelines more explicit
4. **Adjust constraints**: Add/remove constraints as needed
5. **Test again**: Verify improvement

## Version History

- **v1.0** (2025-11-05): Initial prompts for all 5 skills

## Related Documentation

- [Skill Specifications](../docs/specs/README.md) - Detailed skill specs
- [Plugin Proposal](../docs/planning/PLUGIN_PROPOSAL.md) - Overall architecture
- [Implementation Plan](../docs/planning/IMPLEMENTATION_PLAN.md) - Development roadmap

---

**Maintainer**: MT-PRISM Team
**Last Updated**: 2025-11-05
