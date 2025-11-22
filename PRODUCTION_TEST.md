# Production Test Guide - PRD Analyzer

This guide shows you how to run a production test of the PRD Analyzer with a real LLM provider.

## Prerequisites

You need an API key from one of these providers:

### Option 1: Anthropic Claude (Recommended)
- **Model**: claude-sonnet-4.5-20250929
- **Cost**: ~$0.003/1K input, ~$0.015/1K output tokens
- **Get key**: https://console.anthropic.com/

### Option 2: OpenAI GPT-4
- **Model**: gpt-4-turbo
- **Cost**: ~$0.01/1K input, ~$0.03/1K output tokens
- **Get key**: https://platform.openai.com/api-keys

### Option 3: Google Gemini
- **Model**: gemini-1.5-pro
- **Cost**: ~$0.00025/1K input, ~$0.00050/1K output tokens
- **Get key**: https://makersuite.google.com/app/apikey

## Setup

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Add your API key** to `.env`:
   ```bash
   # For Anthropic Claude (recommended)
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-api03-...

   # OR for OpenAI
   AI_PROVIDER=openai
   OPENAI_API_KEY=sk-...

   # OR for Google Gemini
   AI_PROVIDER=google
   GOOGLE_API_KEY=AIza...
   ```

3. **Save the file** and keep it secure (never commit `.env` to git!)

## Running the Test

Run the production test script:

```bash
npm run test:prd
```

This will:
1. ✅ Check for API credentials
2. 📄 Load the test PRD (`tests/fixtures/prds/simple-prd.md`)
3. 🤖 Call the real LLM to analyze the PRD
4. ✅ Validate the output
5. 💾 Save results to `.prism/sessions/{id}/01-prd-analysis/`
6. 📊 Display summary with metrics

## Expected Output

```
╔════════════════════════════════════════════════════════════════╗
║       PRD Analyzer - Production Test                          ║
╚════════════════════════════════════════════════════════════════╝

✓ API Provider: anthropic

📄 Loading PRD from: tests/fixtures/prds/simple-prd.md

PRD Preview (first 200 chars):
# Product Requirements Document: Task Management System

## Overview
A simple task management application that allows users to create, view, update, and delete tasks.

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Session ID: test-1732220451234

Starting PRD Analysis...

📄 Analyzing PRD...
   Session: test-1732220451234
   Content length: 2303 characters
🤖 Initializing AI provider...
   Using: Anthropic Claude (claude-sonnet-4.5-20250929)
📝 Loading prompt template...
🔍 Extracting requirements...
✓ Validating output...
✅ Extracted 8 requirements (45s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Analysis Complete!

Metadata:
  Source: simple-prd.md
  Total Requirements: 8
  Avg Complexity: 3.5/10
  Avg Confidence: 92.0%
  Duration: 45s

Requirements by Type:
  functional: 5
  performance: 2
  security: 1

Sample Requirements:

1. REQ-FUNC-001: User Registration
   Type: functional | Priority: high | Complexity: 3/10
   Confidence: 95%

2. REQ-FUNC-002: Task Creation
   Type: functional | Priority: high | Complexity: 4/10
   Confidence: 93%

3. REQ-PERF-001: Page Load Performance
   Type: performance | Priority: high | Complexity: 4/10
   Confidence: 90%

   ... and 5 more requirements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Output saved to:
  .prism/sessions/test-1732220451234/01-prd-analysis/requirements.yaml

✓ Performance: Within 2-minute target (45s)
✓ Quality: All requirements have high confidence

🎉 Production test completed successfully!
```

## What Gets Tested

✅ **Multi-provider support**: Automatic fallback chain
✅ **Prompt template**: Loads from `prompts/prd-analyzer.md`
✅ **Requirements extraction**: Parses PRD into structured format
✅ **Classification**: Types (functional/performance/security/constraint)
✅ **Ambiguity detection**: Flags vague/incomplete requirements
✅ **Schema validation**: Validates against Zod schemas
✅ **Atomic saves**: Writes to `.prism/sessions/` directory
✅ **Performance**: Checks if < 2 minutes
✅ **Quality metrics**: Complexity and confidence scores

## Troubleshooting

### "No API key found"
- Make sure you created `.env` file (copy from `.env.example`)
- Add your API key to the file
- Check the environment variable name matches your provider

### "Failed to load prompt template"
- Run from project root directory
- Make sure `prompts/prd-analyzer.md` exists

### "Module not found"
- Run `npm install` to install dependencies
- Make sure TypeScript is compiled: `npm run build`

### API errors (401, 403)
- Check your API key is valid
- Verify you have credits/quota remaining
- Try a different provider as fallback

### Slow performance (> 2 minutes)
- Normal for first run (cold start)
- Complex PRDs take longer
- Try a different provider (Gemini is fastest/cheapest)

## Cost Estimate

For the test PRD (~2,300 characters):
- **Input**: ~600 tokens (PRD + prompt)
- **Output**: ~2,000 tokens (structured requirements)
- **Total cost**:
  - Anthropic Claude: ~$0.04
  - OpenAI GPT-4: ~$0.07
  - Google Gemini: ~$0.001

The test costs less than $0.10 with any provider.

## Next Steps

After successful test:

1. ✅ **Try other PRDs**: Test with `complex-prd.md` or your own PRD
2. ✅ **Check output**: Review `.prism/sessions/{id}/01-prd-analysis/requirements.yaml`
3. ✅ **Inspect quality**: Look at confidence scores and detected issues
4. ✅ **Compare providers**: Try all 3 to see accuracy differences
5. ✅ **Ready for production**: Integrate into your workflow

## Testing with Your Own PRD

1. Create a new markdown file with your PRD
2. Update the script to use your file:
   ```bash
   # Edit scripts/test-prd-analyzer.ts
   # Change line: const prdPath = join(process.cwd(), 'path/to/your-prd.md');
   ```
3. Run: `npm run test:prd`

Or use the PRD Analyzer programmatically:

```typescript
import { analyzePRD } from './src/skills/prd-analyzer';

const prdContent = `
# Your PRD content here
...
`;

const result = await analyzePRD(prdContent, 'my-session-123');
console.log(`Extracted ${result.requirements.length} requirements`);
```

## Support

If you encounter issues:
1. Check this guide first
2. Review error messages carefully
3. Verify `.env` configuration
4. Check API provider status pages
5. Try a different provider as fallback
